class RegistrationResponse {
  final bool success;
  final RegistrationData? data;

  RegistrationResponse({
    required this.success,
    this.data,
  });

  factory RegistrationResponse.fromJson(Map<String, dynamic> json) {
    return RegistrationResponse(
      success: json['success'] as bool? ?? false,
      data: json['data'] != null
          ? RegistrationData.fromJson(json['data'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'success': success,
        'data': data?.toJson(),
      };
}

class RegistrationData {
  final Profile profile;
  final Embedding embedding;
  final int processingTimeMs;

  RegistrationData({
    required this.profile,
    required this.embedding,
    required this.processingTimeMs,
  });

  factory RegistrationData.fromJson(Map<String, dynamic> json) {
    return RegistrationData(
      profile: Profile.fromJson(json['profile'] as Map<String, dynamic>),
      embedding: Embedding.fromJson(json['embedding'] as Map<String, dynamic>),
      processingTimeMs: json['processingTimeMs'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'profile': profile.toJson(),
        'embedding': embedding.toJson(),
        'processingTimeMs': processingTimeMs,
      };
}

class Profile {
  final String id;
  final String name;
  final String email;

  Profile({
    required this.id,
    required this.name,
    required this.email,
  });

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
      };
}

class Embedding {
  final String id;
  final double confidence;

  Embedding({
    required this.id,
    required this.confidence,
  });

  factory Embedding.fromJson(Map<String, dynamic> json) {
    return Embedding(
      id: json['id'] as String? ?? '',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'confidence': confidence,
      };
}
