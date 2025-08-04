import 'dart:convert';
import 'dart:io';

import 'package:ai_dashboard_frontend/config/api_config.dart';
import 'package:ai_dashboard_frontend/models/registration_response.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class RegistrationService {
  static String get _baseUrl => ApiConfig.baseUrl;

  /// Registers a new user with name, email, and face image.
  /// Returns [RegistrationResponse] on success.
  /// Throws an exception on network or parse errors.
  static Future<RegistrationResponse> registerUser({
    required String name,
    required String email,
    required XFile imageFile,
  }) async {
    final uri = Uri.parse('$_baseUrl/api/profiles/register');

    // Read the image file
    final file = File(imageFile.path);
    if (!await file.exists()) {
      throw Exception('Image file not found: ${imageFile.path}');
    }

    // Create multipart request
    final request = http.MultipartRequest('POST', uri);

    // Add text fields
    request.fields['name'] = name;
    request.fields['email'] = email;

    // Add image file as multipart
    final multipartFile = await http.MultipartFile.fromPath(
      'image',
      file.path,
      contentType: MediaType('image', 'jpeg'),
    );
    request.files.add(multipartFile);

    // Send request
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final Map<String, dynamic> body = json.decode(response.body);
      return RegistrationResponse.fromJson(body);
    } else {
      throw Exception('Registration API error: ${response.statusCode} ${response.reasonPhrase} - ${response.body}');
    }
  }
}
