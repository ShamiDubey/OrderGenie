import 'dart:convert';
import 'dart:io';

import 'package:ai_dashboard_frontend/config/api_config.dart';
import 'package:ai_dashboard_frontend/models/face_recognition_response.dart';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class FaceRecognitionService {
  static String get _baseUrl => ApiConfig.baseUrl;

  /// Sends the captured [imageFile] (an XFile from camera) to the
  /// /api/face/recognize endpoint as multipart/form-data and returns a [FaceRecognitionResponse].
  /// Throws an exception on network or parse errors.
  static Future<FaceRecognitionResponse> recognizeFace(XFile imageFile) async {
    final uri = Uri.parse('$_baseUrl/api/face/recognize');

    // Read the image file
    final file = File(imageFile.path);
    if (!await file.exists()) {
      throw Exception('Captured image file not found: ${imageFile.path}');
    }

    // Create multipart request with actual file
    final request = http.MultipartRequest('POST', uri);
    
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
      return FaceRecognitionResponse.fromJson(body);
    } else {
      throw Exception('Face recognition API error: ${response.statusCode} ${response.reasonPhrase} - ${response.body}');
    }
  }
}
