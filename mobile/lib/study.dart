import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

class Lesson {
  const Lesson({required this.id, required this.title, required this.content,
    this.subjectId = '', this.subject = 'General', this.level = ''});
  final String id;
  final String title;
  final String content;
  final String subjectId;
  final String subject;
  final String level;

  factory Lesson.fromJson(Map<String, dynamic> data) => Lesson(
    id: '${data['id']}', title: '${data['title'] ?? 'Untitled lesson'}',
    content: '${data['content'] ?? ''}',
    subjectId: '${data['subjectId'] ?? data['subject_id'] ?? ''}',
    subject: '${data['subject'] ?? 'General'}',
    level: '${data['gradeLevel'] ?? data['grade_level'] ?? ''}',
  );

  Map<String, dynamic> toJson() => {'id': id, 'title': title, 'content': content,
    'subjectId': subjectId, 'subject': subject, 'gradeLevel': level};
  int get minutes => (content.split(RegExp(r'\s+')).length / 160).ceil().clamp(2, 60);
}

const demoSubjects = [
  {'id': 'math', 'name': 'Mathematics'},
  {'id': 'science', 'name': 'Integrated Science'},
  {'id': 'english', 'name': 'English'},
  {'id': 'swahili', 'name': 'Kiswahili'},
];

const demoLessons = [
  Lesson(id: 'demo-fractions', subjectId: 'math', subject: 'Mathematics',
    title: 'Making sense of fractions', level: 'Grade 7',
    content: '# Fractions, one step at a time\n\nA fraction describes part of a whole. In **3/4**, the numerator (3) tells you how many parts you have. The denominator (4) tells you how many equal parts make the whole.\n\n## A familiar example\n\nA chapati is cut into 4 equal pieces. If you eat 1 piece, you have eaten **1/4**. There are **3/4** left.\n\n## Adding fractions\n\nWhen the denominators are the same, add the numerators:\n\n**1/4 + 2/4 = 3/4**\n\nWhen they differ, find a common denominator:\n\n**1/2 + 1/4 = 2/4 + 1/4 = 3/4**\n\n## Your turn\n\nA farmer plants vegetables on 2/5 of a field and maize on 1/5. What fraction is planted?\n\n**Answer:** 3/5. The remaining 2/5 is unplanted.'),
  Lesson(id: 'demo-plants', subjectId: 'science', subject: 'Integrated Science',
    title: 'How plants make their food', level: 'Grade 7',
    content: '# Photosynthesis\n\nPlants use sunlight to turn water and carbon dioxide into glucose and oxygen. This process is called **photosynthesis**.\n\n## What a plant needs\n\n- **Sunlight** supplies energy.\n- **Water** is absorbed through the roots.\n- **Carbon dioxide** enters through tiny pores in the leaves.\n- **Chlorophyll**, the green pigment, absorbs light.\n\n## Why it matters\n\nThe maize in a school garden uses photosynthesis to grow. The glucose provides energy and material for growth. Oxygen is released into the air.\n\n## Think about it\n\nWhy might a plant kept in a dark cupboard grow poorly?\n\nWithout enough light, it cannot make enough food through photosynthesis.'),
  Lesson(id: 'demo-writing', subjectId: 'english', subject: 'English',
    title: 'A story worth telling', level: 'Grade 7',
    content: '# Building a strong paragraph\n\nA paragraph develops one main idea. Start with a **topic sentence**, add supporting details, and finish with a closing sentence.\n\n## Example\n\nOur school garden brings us together. Every Friday, we water the seedlings and remove weeds. Last term, we harvested enough spinach for lunch. The garden shows us what teamwork can achieve.\n\n## Your turn\n\nWrite a paragraph about a place you enjoy. Include one main idea and three details that help your reader imagine it.'),
  Lesson(id: 'demo-swahili', subjectId: 'swahili', subject: 'Kiswahili',
    title: 'Methali na maana zake', level: 'Grade 7',
    content: '# Methali\n\nMethali ni usemi mfupi wenye hekima au funzo.\n\n## Haraka haraka haina baraka\n\nMaana: kufanya jambo kwa pupa kunaweza kuleta makosa. Tumia muda wako kufanya kazi kwa makini.\n\n## Umoja ni nguvu, utengano ni udhaifu\n\nMaana: watu wakishirikiana wanaweza kufanikisha mambo makubwa.\n\n## Jaribu\n\nAndika sentensi inayoonyesha matumizi ya methali moja katika maisha ya shuleni.'),
];

class Study extends ChangeNotifier {
  Study(this.api);
  final ElimuApi api;
  Map<String, dynamic>? user;
  bool demo = false;
  bool busy = false;
  String? error;
  String? startupError;
  List<Map<String, dynamic>> subjects = [];
  List<Lesson> lessons = [];
  List<Lesson> saved = [];
  Set<String> completed = {};
  bool dark = false;
  late SharedPreferences _prefs;
  bool get signedIn => user != null;
  String get role => '${user?['role'] ?? 'student'}';
  bool get isStaff => const {'teacher', 'admin', 'super_admin'}.contains(role);
  bool get isAdmin => const {'admin', 'super_admin'}.contains(role);
  String get workspaceTitle => switch (role) {
    'parent' => 'Family', 'teacher' => 'Teaching', 'admin' => 'School',
    'super_admin' => 'Admin', _ => 'Explore',
  };
  String get name => '${user?['name'] ?? 'Learner'}';
  String get level => '${user?['gradeLevel'] ?? user?['grade_level'] ?? ''}';
  String get _scope => demo ? 'demo' : '${user?['id'] ?? 'guest'}';

  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    dark = _prefs.getBool('dark') ?? false;
    try {
      await api.restore();
      if (api.hasSession) {
        final response = await api.get('/api/auth/me');
        user = Map<String, dynamic>.from(response['user'] as Map);
        _loadLocal();
        await load();
      }
    } catch (failure) {
      startupError = '$failure';
    }
    notifyListeners();
  }

  void _loadLocal() {
    try {
      saved = ((jsonDecode(_prefs.getString('saved.$_scope') ?? '[]')) as List)
          .map((item) => Lesson.fromJson(Map<String, dynamic>.from(item))).toList();
    } on FormatException {
      saved = [];
    }
    completed = (_prefs.getStringList('completed.$_scope') ?? []).toSet();
  }

  Future<void> enter(Map<String, dynamic> response) async {
    demo = false;
    user = response['user'] is Map
        ? Map<String, dynamic>.from(response['user'])
        : Map<String, dynamic>.from((await api.get('/api/auth/me'))['user']);
    _loadLocal();
    notifyListeners();
    await load();
  }

  void enterDemo([String role = 'student']) {
    demo = true;
    user = {'id': 'demo-$role', 'name': 'Alex', 'role': role, 'school_id': 'demo-school',
      'email': 'Demo account', 'gradeLevel': 'Grade 7', 'curriculum': 'CBC'};
    subjects = demoSubjects;
    lessons = demoLessons;
    error = null;
    _loadLocal();
    notifyListeners();
  }

  Future<void> load() async {
    if (demo) return;
    busy = true;
    error = null;
    notifyListeners();
    try {
      final filters = <String, String>{
        if (level.isNotEmpty) 'level': level,
        if (user?['curriculum'] != null) 'curriculum': '${user!['curriculum']}',
      };
      final results = await Future.wait([
        api.get('/api/curriculum/subjects', {
          ...filters, if (user?['country'] != null) 'country': '${user!['country']}',
        }),
        api.get('/api/curriculum/offline-lessons', filters),
      ]);
      subjects = (results[0]['subjects'] as List? ?? [])
          .map((item) => Map<String, dynamic>.from(item)).toList();
      lessons = (results[1]['lessons'] as List? ?? [])
          .map((item) => Lesson.fromJson(Map<String, dynamic>.from(item))).toList();
    } catch (failure) {
      error = '$failure';
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> toggleSaved(Lesson lesson) async {
    final next = [...saved];
    if (next.any((item) => item.id == lesson.id)) {
      next.removeWhere((item) => item.id == lesson.id);
    } else {
      next.add(lesson);
    }
    await _prefs.setString('saved.$_scope', jsonEncode(next.map((item) => item.toJson()).toList()));
    saved = next;
    notifyListeners();
  }

  Future<void> complete(Lesson lesson) async {
    final next = {...completed, lesson.id};
    await _prefs.setStringList('completed.$_scope', next.toList());
    completed = next;
    notifyListeners();
  }

  Future<void> setDark(bool value) async {
    await _prefs.setBool('dark', value);
    dark = value;
    notifyListeners();
  }

  Future<void> signOut({bool remote = true}) async {
    try {
      if (!demo && remote) await api.logout();
      if (!remote) await api.clearSession();
    } finally {
      user = null;
      demo = false;
      saved = [];
      completed = {};
      subjects = [];
      lessons = [];
      notifyListeners();
    }
  }
}