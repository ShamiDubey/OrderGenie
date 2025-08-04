class FaceRecognitionResponse {
  final bool success;
  final FaceRecognitionData? data;

  FaceRecognitionResponse({
    required this.success,
    this.data,
  });

  factory FaceRecognitionResponse.fromJson(Map<String, dynamic> json) {
    return FaceRecognitionResponse(
      success: json['success'] as bool? ?? false,
      data: json['data'] != null
          ? FaceRecognitionData.fromJson(json['data'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'success': success,
        'data': data?.toJson(),
      };
}

class FaceRecognitionData {
  final List<Match> matches;
  final int processingTimeMs;
  final Thresholds thresholds;

  FaceRecognitionData({
    required this.matches,
    required this.processingTimeMs,
    required this.thresholds,
  });

  factory FaceRecognitionData.fromJson(Map<String, dynamic> json) {
    return FaceRecognitionData(
      matches: (json['matches'] as List<dynamic>?)
              ?.map((e) => Match.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      processingTimeMs: json['processingTimeMs'] as int? ?? 0,
      thresholds: json['thresholds'] != null
          ? Thresholds.fromJson(json['thresholds'] as Map<String, dynamic>)
          : Thresholds(maxDistance: 0, minSimilarity: 0),
    );
  }

  Map<String, dynamic> toJson() => {
        'matches': matches.map((e) => e.toJson()).toList(),
        'processingTimeMs': processingTimeMs,
        'thresholds': thresholds.toJson(),
      };
}

class Match {
  final String profileId;
  final String name;
  final String email;
  final double distance;
  final double similarity;

  Match({
    required this.profileId,
    required this.name,
    required this.email,
    required this.distance,
    required this.similarity,
  });

  factory Match.fromJson(Map<String, dynamic> json) {
    return Match(
      profileId: json['profileId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      distance: (json['distance'] as num?)?.toDouble() ?? 0.0,
      similarity: (json['similarity'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'profileId': profileId,
        'name': name,
        'email': email,
        'distance': distance,
        'similarity': similarity,
      };
}

class Thresholds {
  final double maxDistance;
  final double minSimilarity;

  Thresholds({
    required this.maxDistance,
    required this.minSimilarity,
  });

  factory Thresholds.fromJson(Map<String, dynamic> json) {
    return Thresholds(
      maxDistance: (json['maxDistance'] as num?)?.toDouble() ?? 0,
      minSimilarity: (json['minSimilarity'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'maxDistance': maxDistance,
        'minSimilarity': minSimilarity,
      };
}
