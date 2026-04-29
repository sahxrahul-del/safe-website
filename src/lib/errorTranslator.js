export const translateFirebaseError = (error) => {
  // If there's no specific error code, return a generic safe message
  if (!error || !error.code) {
    return "An unexpected error occurred. Please try again.";
  }

  switch (error.code) {
    // Auth Errors
    case 'auth/email-already-in-use':
      return "This email is already registered. Please try logging in instead.";
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return "Invalid email or password. Please double-check your credentials.";
    case 'auth/weak-password':
      return "Your password is too weak. It must be at least 6 characters long.";
    case 'auth/network-request-failed':
      return "Network connection failed. Please check your internet and try again.";
    case 'auth/too-many-requests':
      return "Too many failed login attempts. Please wait a few minutes and try again.";
    
    // Firestore Errors
    case 'permission-denied':
      return "You do not have permission to access or modify this data.";
    case 'unavailable':
      return "The database is currently offline or unreachable. Please try again later.";
      
    default:
      // Logs the weird errors to your console so YOU can see them, but hides them from the user
      console.error("Unhandled Firebase Error:", error.code);
      return "Something went wrong on our end. Please try again.";
  }
};