import 'package:elimuai_mobile/api.dart';
import 'package:elimuai_mobile/study.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });
  test('saved lessons and reading progress persist across sessions', () async {
    final study = Study(ElimuApi());
    await study.initialize();
    study.enterDemo();
    await study.toggleSaved(demoLessons.first);
    await study.complete(demoLessons.first);
    final restored = Study(ElimuApi());
    await restored.initialize();
    restored.enterDemo();
    expect(restored.saved.single.content, demoLessons.first.content);
    expect(restored.completed, contains(demoLessons.first.id));
    await restored.toggleSaved(demoLessons.first);
    expect(restored.saved, isEmpty);
  });
  test('sign out clears in-memory account data', () async {
    final study = Study(ElimuApi());
    await study.initialize();
    study.enterDemo();
    await study.signOut();
    expect(study.signedIn, false);
    expect(study.subjects, isEmpty);
    expect(study.saved, isEmpty);
  });
  test('workspaces follow the authenticated role', () async {
    final study = Study(ElimuApi());
    await study.initialize();
    for (final role in ['student', 'parent', 'teacher', 'admin', 'super_admin']) {
      study.enterDemo(role);
      expect(study.role, role);
      expect(study.isStaff, ['teacher', 'admin', 'super_admin'].contains(role));
      expect(study.isAdmin, ['admin', 'super_admin'].contains(role));
    }
    study.user = {'id': 'real-student', 'role': 'student'};
    expect(study.isAdmin, false);
    expect(study.workspaceTitle, 'Explore');
  });
}