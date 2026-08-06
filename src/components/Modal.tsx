import React, { useEffect } from 'react';
import styles from './Modal.module.css'; // Importing the CSS module

// 1. Types Definition
export interface ModalProps {
  isOpen: boolean;               // Controls visibility
  title: string;                 // Mandatory title
  children: React.ReactNode;     // Modal body content
  onCancel: () => void;          // Handles closing the modal
  onSubmit?: () => void;         // Optional submit action
  submitText?: string;           // Custom text for submit button
  cancelText?: string;           // Custom text for cancel button
  size?: 'sm' | 'md' | 'lg';     // Controls modal width
}

// 2. Component Implementation
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  children,
  onCancel,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  size = 'md',
}) => {
  
  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Combine base class with dynamic size class
  const modalContainerClass = `${styles.modalContainer} ${styles[size]}`;

  return (
    // Backdrop
    <div className={styles.backdrop} onClick={onCancel}>
      {/* Modal Container */}
      <div className={modalContainerClass} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button 
            onClick={onCancel}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            &times;
          </button>
        </header>

        {/* Body */}
        <main className={styles.body}>
          {children}
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          <button onClick={onCancel} className={styles.cancelBtn}>
            {cancelText}
          </button>
          
          {onSubmit && (
            <button onClick={onSubmit} className={styles.submitBtn}>
              {submitText}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
