/**
 * Google Drive Service
 * Handles OAuth2 redirection, token management, and REST API communication.
 */

// Generate authorization redirect URL and redirect browser
export function redirectToGoogleAuth() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error("VITE_GOOGLE_CLIENT_ID is not configured in .env.local");
    alert("VITE_GOOGLE_CLIENT_ID is not configured. Please add it to your .env.local file.");
    return;
  }

  // Always redirect to the root URL to simplify OAuth registration
  const redirectUri = window.location.origin + '/';
  console.log('[GDrive] OAuth redirect URI:', redirectUri);
  console.log('[GDrive] Current pathname:', window.location.pathname);
  const scope = 'https://www.googleapis.com/auth/drive.file';
  const responseType = 'token';
  const state = 'gdrive_auth';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=${responseType}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}` +
    `&include_granted_scopes=true`;

  window.location.href = authUrl;
}

// Check URL hash for token, cache it and clean URL
export function handleOAuthResponse() {
  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.substring(1)); // remove '#'
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  const state = params.get('state');

  if (accessToken && state === 'gdrive_auth') {
    const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000;
    
    localStorage.setItem('gdrive_access_token', accessToken);
    localStorage.setItem('gdrive_token_expires_at', expiresAt.toString());

    // Clean URL hash to avoid token exposure and routing issues
    window.history.replaceState(null, null, window.location.pathname + window.location.search);
    
    // Retrieve original path to navigate back
    const redirectPath = sessionStorage.getItem('gdrive_redirect_path') || '/';
    sessionStorage.removeItem('gdrive_redirect_path');

    return { token: accessToken, redirectPath };
  }
  return null;
}

// Retrieve cached token if it's still valid
export function getCachedToken() {
  const token = localStorage.getItem('gdrive_access_token');
  const expiresAtStr = localStorage.getItem('gdrive_token_expires_at');
  
  if (!token || !expiresAtStr) return null;
  
  const expiresAt = parseInt(expiresAtStr, 10);
  // Give a 60-second buffer before expiration
  if (Date.now() >= expiresAt - 60000) {
    clearCachedToken();
    return null;
  }
  
  return token;
}

// Clear token from cache
export function clearCachedToken() {
  localStorage.removeItem('gdrive_access_token');
  localStorage.removeItem('gdrive_token_expires_at');
  localStorage.removeItem('gdrive_last_file_id');
  localStorage.removeItem('gdrive_last_file_name');
}

// List all .db files accessible by the app
export async function listDriveFiles(token) {
  const query = "name contains '.db' and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)&orderBy=name`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearCachedToken();
      throw new Error('Unauthorized');
    }
    throw new Error(`Failed to list Google Drive files: ${response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
}

// Download file contents as Blob
export async function downloadDriveFile(token, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearCachedToken();
      throw new Error('Unauthorized');
    }
    throw new Error(`Failed to download file from Google Drive: ${response.statusText}`);
  }

  return await response.blob();
}

// Create a new blank database file on Google Drive
export async function createDriveFile(token, name) {
  const url = 'https://www.googleapis.com/drive/v3/files';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: name,
      mimeType: 'application/x-sqlite3'
    })
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearCachedToken();
      throw new Error('Unauthorized');
    }
    throw new Error(`Failed to create file on Google Drive: ${response.statusText}`);
  }

  const fileData = await response.json();
  return fileData.id;
}

// Upload/overwrite database content
export async function updateDriveFile(token, fileId, uint8Array) {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-sqlite3'
    },
    body: uint8Array
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearCachedToken();
      throw new Error('Unauthorized');
    }
    throw new Error(`Failed to upload to Google Drive: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}
