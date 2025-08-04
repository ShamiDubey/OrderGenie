class ApiConfig {
  static const String baseUrl = 'https://affectedly-unkilled-rolande.ngrok-free.dev';

  // Common headers for all API requests
  static Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
}
