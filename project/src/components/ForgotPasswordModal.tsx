import React, { useState } from 'react';
import { X, Mail, Lock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ 
  isOpen, 
  onClose, 
  userEmail = '' 
}) => {
  const [email, setEmail] = useState(userEmail);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !newPassword) {
      setStatus('error');
      setMessage('Please enter both email and new password');
      return;
    }

    if (newPassword.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      // Call the database function to reset password
      const { data, error } = await supabase.rpc('reset_user_password', {
        user_email: email.trim(),
        new_password: newPassword
      });

      if (error) {
        throw error;
      }

      setStatus('success');
      setMessage('Password reset successfully');
      
      // Clear form
      setNewPassword('');
      setShowPassword(false);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setMessage('');
      }, 2000);

    } catch (error: any) {
      console.error('Password reset error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setStatus('idle');
      setMessage('');
      setNewPassword('');
      setShowPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-dark-surface border border-dark-surface rounded-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Reset User Password</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition-colors duration-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-2">
              User Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user email"
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-400 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-200"
                disabled={isLoading}
              >
                {showPassword ? <X className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              status === 'success' 
                ? 'bg-green-500/10 border border-green-500/20' 
                : 'bg-red-500/10 border border-red-500/20'
            }`}>
              {status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
              <span className={`text-sm ${
                status === 'success' ? 'text-green-400' : 'text-red-400'
              }`}>
                {message}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email || !newPassword}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Reset Password</span>
              </>
            )}
          </button>
        </form>

        {/* Info Text */}
        <div className="mt-4 text-xs text-slate-400">
          <p>• Only administrators can reset user passwords</p>
          <p>• The user will be able to log in with the new password immediately</p>
          <p>• Consider notifying the user about the password change</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal; 