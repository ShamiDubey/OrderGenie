import 'package:shared_preferences/shared_preferences.dart';

class UserSessionService {
  static const String _keyUserName = 'user_name';
  static const String _keyProfileId = 'profile_id';
  static const String _keyIsLoggedIn = 'is_logged_in';

  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static Future<void> saveUserSession({
    required String userName,
    required String profileId,
  }) async {
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs!.setString(_keyUserName, userName);
    await _prefs!.setString(_keyProfileId, profileId);
    await _prefs!.setBool(_keyIsLoggedIn, true);
  }

  static Future<void> clearSession() async {
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs!.remove(_keyUserName);
    await _prefs!.remove(_keyProfileId);
    await _prefs!.setBool(_keyIsLoggedIn, false);
  }

  static bool get isLoggedIn {
    return _prefs?.getBool(_keyIsLoggedIn) ?? false;
  }

  static String? get userName {
    return _prefs?.getString(_keyUserName);
  }

  static String? get profileId {
    return _prefs?.getString(_keyProfileId);
  }
}
