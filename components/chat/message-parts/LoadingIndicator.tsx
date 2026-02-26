import React from 'react';
import styles from './LoadingIndicator.module.css';

const LoadingIndicator: React.FC = () => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingDots}>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
      </div>
    </div>
  );
};

export default React.memo(LoadingIndicator);
