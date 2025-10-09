import React, { useState, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  Star, 
  Edit3, 
  Calendar, 
  HardDrive, 
  Tag, 
  User,
  Image,
  Music,
  Archive,
  File,
  Save,
  Link,
  Copy,
  Play,
  Pause,
  MessageSquare,
  Info,
  Loader,
  Smile
} from 'lucide-react';
import { RiFile3Line, RiVideoLine } from '@remixicon/react';
import { Icon, IconSizes, IconColors } from './ui/Icon';
import { FileItem } from './features/FileCard';
import { supabase } from '../lib/supabase';
import AutoTaggingButton from './AutoTaggingButton';
import TagInput from './TagInput';
import VideoPlayer from './VideoPlayer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface CommentReaction {
  emoji: string;
  count: number;
  users: string[]; // user emails or IDs
  hasReacted: boolean; // has current user reacted
}

interface FileComment {
  id: string;
  file_id: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  comment_text: string;
  timestamp_seconds: number | null;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  replies?: FileComment[];
  reactions?: CommentReaction[];
}

interface FilePreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (fileId: string, updates: Partial<FileItem>) => void;
  onToggleFavorite?: (fileId: string) => void;
  userRole?: 'admin' | 'employee';
  isPreviewMode?: boolean;
  initialTab?: 'comments' | 'fields';
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = memo(({
  file,
  isOpen,
  onClose,
  onUpdate,
  onToggleFavorite,
  userRole = 'admin',
  isPreviewMode = false,
  initialTab = 'comments'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [editedFileUrl, setEditedFileUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'comments' | 'fields'>('comments');
  const [commentText, setCommentText] = useState('');
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [comments, setComments] = useState<FileComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showNativeEmojiPicker, setShowNativeEmojiPicker] = useState(false);

  // Set initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Check permissions
  const canEdit = userRole === 'admin';
  const canEditTags = userRole === 'admin';

  const loadComments = async () => {
    if (!file) return;
    
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('file_comments')
        .select('*')
        .eq('file_id', file.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Get current user for reaction tracking
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserEmail = user?.email || 'demo@example.com';
      
      // Fetch all reactions for these comments
      const commentIds = (data || []).map(c => c.id);
      const { data: reactionsData } = await supabase
        .from('comment_reactions')
        .select('*')
        .in('comment_id', commentIds);
      
      // Group reactions by comment and emoji
      const reactionsByComment = new Map<string, CommentReaction[]>();
      (reactionsData || []).forEach(reaction => {
        if (!reactionsByComment.has(reaction.comment_id)) {
          reactionsByComment.set(reaction.comment_id, []);
        }
        
        const commentReactions = reactionsByComment.get(reaction.comment_id)!;
        const existingReaction = commentReactions.find(r => r.emoji === reaction.emoji);
        
        if (existingReaction) {
          existingReaction.count++;
          existingReaction.users.push(reaction.user_email);
          if (reaction.user_email === currentUserEmail) {
            existingReaction.hasReacted = true;
          }
        } else {
          commentReactions.push({
            emoji: reaction.emoji,
            count: 1,
            users: [reaction.user_email],
            hasReacted: reaction.user_email === currentUserEmail
          });
        }
      });
      
      // Structure comments with replies and reactions
      const allComments = (data || []).map(comment => ({
        ...comment,
        reactions: reactionsByComment.get(comment.id) || []
      }));
      
      const topLevelComments = allComments.filter(c => !c.parent_comment_id);
      const structuredComments = topLevelComments.map(comment => ({
        ...comment,
        replies: allComments.filter(c => c.parent_comment_id === comment.id)
      }));
      
      setComments(structuredComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Load comments when file changes
  useEffect(() => {
    if (file) {
      setEditedName(file.name);
      setEditedTags(file.tags || []);
      setEditedFileUrl(file.fileUrl || '');
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const saveComment = async () => {
    if (!commentText.trim() || !file) return;

    setSavingComment(true);
    try {
      // Get current user or use demo user
      const { data: { user } } = await supabase.auth.getUser();
      
      const commentData = {
        file_id: file.id,
        user_id: user?.id || null,
        user_name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Demo User',
        user_email: user?.email || 'demo@example.com',
        comment_text: commentText.trim(),
        timestamp_seconds: (file.type === 'video' && showTimestamp) ? videoCurrentTime : null,
        parent_comment_id: null
      };

      const { error } = await supabase
        .from('file_comments')
        .insert([commentData]);

      if (error) throw error;

      // Reload comments
      await loadComments();
      setCommentText('');
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment. Please try again.');
    } finally {
      setSavingComment(false);
    }
  };

  const saveReply = async (parentCommentId: string) => {
    if (!replyText.trim() || !file) return;

    setSavingComment(true);
    try {
      // Get current user or use demo user
      const { data: { user } } = await supabase.auth.getUser();
      
      const replyData = {
        file_id: file.id,
        user_id: user?.id || null,
        user_name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Demo User',
        user_email: user?.email || 'demo@example.com',
        comment_text: replyText.trim(),
        timestamp_seconds: null,
        parent_comment_id: parentCommentId
      };

      console.log('💾 Saving reply with data:', replyData);

      const { data, error } = await supabase
        .from('file_comments')
        .insert([replyData])
        .select();

      if (error) {
        console.error('❌ Supabase error saving reply:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Reply saved successfully:', data);

      // Reload comments
      await loadComments();
      setReplyText('');
      setReplyingTo(null);
    } catch (error: any) {
      console.error('❌ Error saving reply:', {
        message: error?.message || 'Unknown error',
        error: error
      });
      alert(`Failed to save reply: ${error?.message || 'Please check console for details'}`);
    } finally {
      setSavingComment(false);
    }
  };

  const toggleReaction = async (commentId: string, emoji: string) => {
    if (!file) return;

    try {
      // Get current user or use demo user
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserEmail = user?.email || 'demo@example.com';
      const currentUserName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Demo User';

      console.log('🎭 Toggling reaction:', { commentId, emoji, userEmail: currentUserEmail });

      // Check if user already reacted with this emoji
      const { data: existingReaction, error: fetchError } = await supabase
        .from('comment_reactions')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_email', currentUserEmail)
        .eq('emoji', emoji)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Error fetching existing reaction:', fetchError);
      }

      if (existingReaction) {
        // Remove reaction
        console.log('➖ Removing reaction');
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_email', currentUserEmail)
          .eq('emoji', emoji);

        if (error) {
          console.error('❌ Error removing reaction:', error);
          throw error;
        }
        console.log('✅ Reaction removed');
      } else {
        // Add reaction
        console.log('➕ Adding reaction');
        const reactionData = {
          comment_id: commentId,
          user_id: user?.id || null,
          user_name: currentUserName,
          user_email: currentUserEmail,
          emoji: emoji
        };

        const { error } = await supabase
          .from('comment_reactions')
          .insert([reactionData]);

        if (error) {
          console.error('❌ Error adding reaction:', error);
          throw error;
        }
        console.log('✅ Reaction added');
      }

      // Reload comments to update reactions
      await loadComments();
    } catch (error: any) {
      console.error('❌ Error toggling reaction:', {
        message: error?.message || 'Unknown error',
        error: error
      });
    }
  };


  // Prevent drag operations on the modal content
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const getFileIcon = (type: FileItem['type']) => {
    const iconClass = "w-12 h-12";
    switch (type) {
      case 'document':
        return <Icon Icon={RiFile3Line} size={48} color="#60a5fa" className={iconClass} />;
      case 'image':
        return <Icon Icon={Image} size={48} color="#4ade80" className={iconClass} />;
      case 'video':
        return <Icon Icon={RiVideoLine} size={48} color="#a855f7" className={iconClass} />;
      case 'audio':
        return <Icon Icon={Music} size={48} color="#fb923c" className={iconClass} />;
      case 'archive':
        return <Icon Icon={Archive} size={48} color="#eab308" className={iconClass} />;
      default:
        return <Icon Icon={File} size={48} color="#94a3b8" className={iconClass} />;
    }
  };

  const getFileUrl = () => {
    if (file.fileUrl) return file.fileUrl;
    
    // Generate Supabase public URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/files/${file.filePath}`;
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(file.filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleSave = async () => {
    if (!onUpdate) return;

    try {
      await onUpdate(file.id, {
        name: editedName,
        tags: editedTags,
        fileUrl: editedFileUrl || undefined
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleCopyFileUrl = async () => {
    if (!file.fileUrl) return;

    try {
      await navigator.clipboard.writeText(file.fileUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleShare = async () => {
    try {
      const fileUrl = getFileUrl();
      if (navigator.share) {
        await navigator.share({
          title: file.name,
          text: `Check out this file: ${file.name}`,
          url: fileUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(fileUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(getFileUrl());
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (clipboardError) {
        console.error('Clipboard copy failed:', clipboardError);
      }
    }
  };

  const handleTagsUpdated = (newTags: string[]) => {
    if (onUpdate) {
      onUpdate(file.id, { tags: newTags });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00:00:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);
  };

  const handleVideoPlay = () => setIsPlaying(true);
  const handleVideoPause = () => setIsPlaying(false);

  return (
    <AnimatePresence>
      {isOpen && file && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-[#111111]/95 backdrop-blur-md rounded-xl border border-[#2A2A2A]/40 w-full max-w-[calc(100vw-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden shadow-2xl relative"
            draggable={false}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={(e) => e.stopPropagation()}
          >
        {/* Top Header with Path, Filename, and Share */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]/40">
          {/* Left: Path and Filename */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 text-sm text-[#CFCFF6]/60 mb-1">
              <span>Projects</span>
              <span>/</span>
              <span>Current Project</span>
              <span>/</span>
              <span>Media</span>
            </div>
          <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-[#CFCFF6] truncate">{file.name}</h1>
            {file.isFavorite && (
                <Star className="w-6 h-6 text-yellow-400 fill-current flex-shrink-0" />
            )}
          </div>
          </div>
          
          {/* Right: Share Button and Close */}
          <div className="flex items-center space-x-3">
              <button
              onClick={handleShare}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                copySuccess 
                  ? 'border-2 border-green-500 bg-green-500/20 text-[#CFCFF6]' 
                  : 'border-2 border-[#4338CA] bg-[#4338CA]/20 text-[#CFCFF6] hover:bg-[#4338CA]/30 hover:text-white'
              }`}
            >
              <Link className="w-4 h-4" />
              <span>{copySuccess ? 'Copied!' : 'Share'}</span>
              </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#CFCFF6]/60 hover:text-white hover:bg-[#22243E] transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-200px)]">
          {/* Main Preview Area - Much Larger */}
          <div className="flex-1 flex items-center justify-center bg-[#0C0E1F]/30 p-6 pb-8">
            <div className="w-full h-full flex items-center justify-center">
              {file.type === 'image' ? (
                <img
                  src={file.thumbnail || getFileUrl()}
                  alt={file.name}
                  className="w-full h-full object-contain rounded-xl shadow-2xl"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== getFileUrl()) {
                      target.src = getFileUrl();
                    }
                  }}
                />
              ) : file.type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <VideoPlayer
                    src={getFileUrl()}
                    poster={file.thumbnail}
                    className="w-full h-full rounded-xl shadow-2xl"
                    showTimer={true}
                    onTimeUpdate={setVideoCurrentTime}
                  />
                </div>
              ) : file.thumbnail ? (
                <img
                  src={file.thumbnail}
                  alt={file.name}
                  className="w-full h-full object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <div className="text-center">
                  {getFileIcon(file.type)}
                  <p className="text-slate-400 mt-4 text-lg font-medium">{file.originalName}</p>
                  <p className="text-slate-500 text-sm mt-2">No preview available</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Two Sections with Tab Buttons */}
          <div className="w-80 border-l border-[#2A2A2A]/40 flex flex-col">
            {/* Tab Buttons - Like in the image */}
            <div className="flex border-b border-[#2A2A2A]/40 p-2">
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeTab === 'comments'
                    ? 'bg-[#22243E] text-[#CFCFF6] border border-[#4338CA]/30'
                    : 'text-[#CFCFF6]/70 hover:bg-[#22243E]/60 border border-transparent'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comments</span>
              </button>
              <button
                onClick={() => setActiveTab('fields')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeTab === 'fields'
                    ? 'bg-[#22243E] text-[#CFCFF6] border border-[#4338CA]/30'
                    : 'text-[#CFCFF6]/70 hover:bg-[#22243E]/60 border border-transparent'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Fields</span>
              </button>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'comments' ? (
              <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-[#CFCFF6]">Comments</h3>
                </div>
                <div className="space-y-4 flex-1">
                  {loadingComments ? (
                    <div className="text-center py-8">
                      <Loader className="w-8 h-8 text-[#4338CA] animate-spin mx-auto mb-3" />
                      <p className="text-[#CFCFF6]/60 text-sm">Loading comments...</p>
                    </div>
                  ) : comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="space-y-3">
                        {/* Main Comment */}
                        <div className="bg-[#000000]/40 border border-[#2A2A2A]/40 rounded-lg p-3">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-[#4338CA]/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-[#4338CA]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-[#CFCFF6]">{comment.user_name}</p>
                                <p className="text-xs text-[#CFCFF6]/50">
                                  {new Date(comment.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              {comment.timestamp_seconds !== null && (
                                <div className="bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded text-xs font-mono inline-block mb-2">
                                  {formatTime(comment.timestamp_seconds)}
                                </div>
                              )}
                              <p className="text-sm text-[#CFCFF6]/80 break-words">{comment.comment_text}</p>
                              
                              {/* Reactions Display */}
                              {comment.reactions && comment.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {comment.reactions.map((reaction) => (
                                    <button
                                      key={reaction.emoji}
                                      onClick={() => toggleReaction(comment.id, reaction.emoji)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all duration-150 ${
                                        reaction.hasReacted
                                          ? 'bg-[#4338CA]/20 border border-[#4338CA]/50 text-[#CFCFF6]'
                                          : 'bg-[#000000]/60 border border-[#2A2A2A]/40 text-[#CFCFF6]/70 hover:bg-[#000000]/80 hover:border-[#2A2A2A]/60'
                                      }`}
                                      title={reaction.users.join(', ')}
                                    >
                                      <span className="text-sm">{reaction.emoji}</span>
                                      <span className="font-medium">{reaction.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  onClick={() => setReplyingTo(comment.id)}
                                  className="text-xs text-[#4338CA] hover:text-[#4338CA] transition-colors font-medium"
                                >
                                  Reply
                                </button>
                                
                                {/* Emoji Picker */}
                                <div className="relative inline-block">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button 
                                        className="text-[#CFCFF6] hover:text-emerald-400 transition-colors"
                                        title="Add reaction"
                                      >
                                        <Smile className="w-4 h-4" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                      className="w-auto p-2 bg-[#000000] border border-[#2A2A2A] shadow-lg z-[10000]"
                                      sideOffset={5}
                                      align="start"
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className="flex gap-1">
                                          {['👍', '❤️', '😂', '😮', '👏'].map((emoji) => (
                                            <button
                                              key={emoji}
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleReaction(comment.id, emoji);
                                              }}
                                              className="text-xl p-2 rounded-md hover:bg-[#2A2A2A] transition-all duration-150"
                                              title={`React with ${emoji}`}
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                        {/* Native emoji picker trigger */}
                                        <button
                                          onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'text';
                                            input.style.position = 'absolute';
                                            input.style.opacity = '0';
                                            input.style.pointerEvents = 'none';
                                            document.body.appendChild(input);
                                            
                                            // Try to trigger native emoji picker
                                            input.focus();
                                            
                                            input.addEventListener('input', (e) => {
                                              const emoji = (e.target as HTMLInputElement).value;
                                              if (emoji) {
                                                toggleReaction(comment.id, emoji);
                                              }
                                              document.body.removeChild(input);
                                            });
                                            
                                            input.addEventListener('blur', () => {
                                              setTimeout(() => {
                                                if (document.body.contains(input)) {
                                                  document.body.removeChild(input);
                                                }
                                              }, 100);
                                            });
                                          }}
                                          className="text-xs text-[#CFCFF6]/60 hover:text-[#CFCFF6] transition-colors px-2 py-1 rounded border border-[#2A2A2A] hover:border-[#3A3A3A]"
                                        >
                                          More emojis...
                                        </button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Reply Input (if replying to this comment) */}
                        {replyingTo === comment.id && (
                          <div className="ml-11 space-y-2">
                            <div className="flex items-end gap-2">
                              <input
                                type="text"
                                placeholder="Write a reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="flex-1 min-w-0 bg-[#000000]/60 border-2 border-[#2A2A2A]/60 rounded-lg px-3 py-2 text-[#CFCFF6] placeholder-[#CFCFF6]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:border-[#4338CA] hover:bg-[#000000]/80 hover:border-[#2A2A2A]/80 transition-all duration-200"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && replyText.trim() && !savingComment) {
                                    e.preventDefault();
                                    saveReply(comment.id);
                                  }
                                  if (e.key === 'Escape') {
                                    setReplyingTo(null);
                                    setReplyText('');
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => saveReply(comment.id)}
                                disabled={!replyText.trim() || savingComment}
                                className="px-3 py-2 bg-[#4338CA] hover:bg-[#4338CA]/90 text-white rounded-lg font-medium transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                              >
                                {savingComment ? (
                                  <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <span>Reply</span>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                                className="px-3 py-2 bg-[#000000]/60 hover:bg-[#000000] text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-all duration-200 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Nested Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-11 space-y-2">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="bg-[#000000]/30 border border-[#2A2A2A]/30 rounded-lg p-3">
                                <div className="flex items-start space-x-3">
                                  <div className="w-6 h-6 bg-[#4338CA]/15 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="w-3 h-3 text-[#4338CA]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-xs font-medium text-[#CFCFF6]">{reply.user_name}</p>
                                      <p className="text-xs text-[#CFCFF6]/50">
                                        {new Date(reply.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                    <p className="text-xs text-[#CFCFF6]/80 break-words">{reply.comment_text}</p>
                                    
                                    {/* Reactions Display for Replies */}
                                    {reply.reactions && reply.reactions.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {reply.reactions.map((reaction) => (
                                          <button
                                            key={reaction.emoji}
                                            onClick={() => toggleReaction(reply.id, reaction.emoji)}
                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs transition-all duration-150 ${
                                              reaction.hasReacted
                                                ? 'bg-[#4338CA]/20 border border-[#4338CA]/50 text-[#CFCFF6]'
                                                : 'bg-[#000000]/60 border border-[#2A2A2A]/40 text-[#CFCFF6]/70 hover:bg-[#000000]/80 hover:border-[#2A2A2A]/60'
                                            }`}
                                            title={reaction.users.join(', ')}
                                          >
                                            <span className="text-xs">{reaction.emoji}</span>
                                            <span className="font-medium text-xs">{reaction.count}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Emoji Picker for Replies */}
                                    <div className="mt-2 relative inline-block">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button 
                                            className="text-[#CFCFF6]/60 hover:text-emerald-400 transition-colors"
                                            title="Add reaction"
                                          >
                                            <Smile className="w-3 h-3" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent 
                                          className="w-auto p-2 bg-[#000000] border border-[#2A2A2A] shadow-lg z-[10000]"
                                          sideOffset={5}
                                          align="start"
                                        >
                                          <div className="flex flex-col gap-2">
                                            <div className="flex gap-1">
                                              {['👍', '❤️', '😂', '😮', '👏'].map((emoji) => (
                                                <button
                                                  key={emoji}
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleReaction(reply.id, emoji);
                                                  }}
                                                  className="text-lg p-1.5 rounded-md hover:bg-[#2A2A2A] transition-all duration-150"
                                                  title={`React with ${emoji}`}
                                                >
                                                  {emoji}
                                                </button>
                                              ))}
                                            </div>
                                            {/* Native emoji picker trigger */}
                                            <button
                                              onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'text';
                                                input.style.position = 'absolute';
                                                input.style.opacity = '0';
                                                input.style.pointerEvents = 'none';
                                                document.body.appendChild(input);
                                                
                                                input.focus();
                                                
                                                input.addEventListener('input', (e) => {
                                                  const emoji = (e.target as HTMLInputElement).value;
                                                  if (emoji) {
                                                    toggleReaction(reply.id, emoji);
                                                  }
                                                  document.body.removeChild(input);
                                                });
                                                
                                                input.addEventListener('blur', () => {
                                                  setTimeout(() => {
                                                    if (document.body.contains(input)) {
                                                      document.body.removeChild(input);
                                                    }
                                                  }, 100);
                                                });
                                              }}
                                              className="text-xs text-[#CFCFF6]/60 hover:text-[#CFCFF6] transition-colors px-2 py-1 rounded border border-[#2A2A2A] hover:border-[#3A3A3A]"
                                            >
                                              More emojis...
                                            </button>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-[#000000]/60 border border-[#2A2A2A] rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="w-6 h-6 text-[#8A8C8E]" />
                      </div>
                      <p className="text-[#CFCFF6]/60 text-sm">No comments yet</p>
                      <p className="text-[#CFCFF6]/40 text-xs mt-1">Be the first to add a comment</p>
                    </div>
                  )}
                </div>
                
                {/* Comment Input within sidebar */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="space-y-2">
                    {/* Comment Input Field with Timer */}
                    <div className="flex items-center w-full">
                      {/* Video Timer (only for videos and when enabled) - positioned at start */}
                      {file.type === 'video' && showTimestamp && (
                        <div className="bg-amber-900/80 text-amber-200 px-2 py-1 rounded text-xs font-mono tracking-wider flex-shrink-0 mr-2" style={{fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'}}>
                          {formatTime(videoCurrentTime)}
                        </div>
                      )}
                      
                      <input
                        type="text"
                        placeholder="Leave your comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 min-w-0 bg-[#000000]/60 border-2 border-[#2A2A2A]/60 rounded-lg px-3 py-2 text-[#CFCFF6] placeholder-[#CFCFF6]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:border-[#4338CA] hover:bg-[#000000]/80 hover:border-[#2A2A2A]/80 transition-all duration-200"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && commentText.trim() && !savingComment) {
                            e.preventDefault();
                            saveComment();
                          }
                        }}
                      />
                    </div>
                    
                    {/* Action Icons and Controls */}
                    <div className="flex items-center justify-between">
                      {/* Timestamp Toggle Button */}
                      <button 
                        onClick={() => setShowTimestamp(!showTimestamp)}
                        className={`transition-colors duration-200 ${showTimestamp ? 'text-amber-400 hover:text-amber-300' : 'text-gray-400 hover:text-gray-300'}`} 
                        title={showTimestamp ? "Hide timestamp" : "Show timestamp"}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Send Button */}
                      <button
                        onClick={saveComment}
                        disabled={!commentText.trim() || savingComment}
                        className="border-2 border-[#4338CA] bg-[#4338CA]/20 text-[#CFCFF6] hover:bg-[#4338CA]/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-lg transition-all duration-200"
                        title="Send comment"
                      >
                        {savingComment ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold text-[#CFCFF6] mb-4">File Details</h3>
                <div className="space-y-4">
              {/* File Name */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  File Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#000000]/60 border-2 border-[#2A2A2A]/60 rounded-lg text-[#CFCFF6] focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:border-[#4338CA] hover:bg-[#000000]/80 hover:border-[#2A2A2A]/80 transition-all duration-200"
                  />
                ) : (
                  <p className="text-[#CFCFF6] font-medium">{file.name}</p>
                )}
              </div>

              {/* Original Name */}
              <div>
                <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">
                  Original Name
                </label>
                    <p className="text-[#CFCFF6]/80 text-sm">{file.originalName}</p>
              </div>

                  {/* File Type & Size */}
                  <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">
                    Type
                  </label>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#4338CA]/20 text-[#CFCFF6] border border-[#4338CA]/30">
                    {file.type.charAt(0).toUpperCase() + file.type.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">
                        Size
                  </label>
                      <p className="text-[#CFCFF6]/80 text-sm">{file.size}</p>
                </div>
              </div>

              {/* Upload Date */}
              <div>
                <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Last Modified
                </label>
                    <p className="text-[#CFCFF6]/80 text-sm">{file.modifiedDate}</p>
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[#CFCFF6]/70">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Tags
                  </label>
                  {!isEditing && canEditTags && (
                    <AutoTaggingButton
                      fileId={file.id}
                      currentTags={file.tags || []}
                      onTagsUpdated={handleTagsUpdated}
                      className="text-xs"
                    />
                  )}
                </div>
                {isEditing && canEditTags ? (
                  <TagInput
                    tags={editedTags}
                    onTagsChange={setEditedTags}
                    placeholder="Add tag..."
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {file.tags && file.tags.length > 0 ? (
                      file.tags.map((tag) => (
                        <span
                          key={tag}
                              className="inline-flex items-center px-2 py-1 bg-[#4338CA]/20 text-[#CFCFF6] text-xs rounded-lg border border-[#4338CA]/30"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-[#CFCFF6]/50 text-sm">No tags</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
                  <div className="pt-4 border-t border-slate-700/50 space-y-3">
                {isEditing ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border-2 border-[#4338CA] bg-[#4338CA]/20 text-[#CFCFF6] hover:bg-[#4338CA]/30 hover:text-white rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                      <Save className="w-4 h-4" />
                          <span>Save</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                          className="px-3 py-2 bg-[#000000]/60 hover:bg-[#000000] text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-all duration-200 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                      <div className="space-y-2">
                  <button
                    onClick={handleDownload}
                          className="w-full flex items-center justify-center space-x-2 px-3 py-2 border-2 border-[#4338CA] bg-[#4338CA]/20 text-[#CFCFF6] hover:bg-[#4338CA]/30 hover:text-white rounded-lg font-medium transition-all duration-200 text-sm"
                  >
                    <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                        {canEdit && !isPreviewMode && (
                          <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-[#000000]/60 hover:bg-[#000000] text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-all duration-200 text-sm"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit Details</span>
                  </button>
                        )}
                      </div>
                )}
              </div>

              {/* Permission Notice for Employees */}
              {userRole === 'employee' && !isPreviewMode && (
                    <div className="pt-4 border-t border-[#2A2A2A]/50">
                  <div className="bg-[#000000]/50 rounded-lg p-3 border border-[#2A2A2A]/30">
                    <p className="text-xs text-[#CFCFF6]/60">
                      <User className="w-3 h-3 inline mr-1" />
                      Employee account: Limited permissions. Contact an admin for additional file management options.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
            )}
        </div>
        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

FilePreviewModal.displayName = 'FilePreviewModal';

export default FilePreviewModal;