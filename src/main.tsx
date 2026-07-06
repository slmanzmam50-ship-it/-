// Force clear old PWA caches and reload once
const FORCE_UPDATE_VERSION = 'clear_cache_v4';
if (localStorage.getItem('pwa_cache_ver') !== FORCE_UPDATE_VERSION) {
  localStorage.setItem('pwa_cache_ver', FORCE_UPDATE_VERSION);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
  // Clear browser session storage
  sessionStorage.clear();
  // Hard reload
  setTimeout(() => {
    window.location.reload();
  }, 400);
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW registered');
        if (reg.waiting) {
          window.dispatchEvent(new CustomEvent('swUpdateAvailable', { detail: reg }));
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('swUpdateAvailable', { detail: reg }));
              }
            });
          }
        });
      })
      .catch(err => console.log('SW registration failed', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
