import 'package:flutter/material.dart';

import 'api.dart';
import 'onboarding.dart';
import 'screens.dart';
import 'sign_in.dart';
import 'splash.dart';
import 'study.dart';
import 'ui.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final study = Study(ElimuApi());
  runApp(ElimuApp(study: study));
}

class ElimuApp extends StatefulWidget {
  const ElimuApp({super.key, required this.study});
  final Study study;
  @override
  State<ElimuApp> createState() => _ElimuAppState();
}

class _ElimuAppState extends State<ElimuApp> {
  // Pair init with a minimum delay so the branded splash reads as intentional.
  late final Future<void> initialization = Future.wait([
    widget.study.initialize(),
    Future<void>.delayed(const Duration(milliseconds: 1600)),
  ]);
  @override
  Widget build(BuildContext context) => ListenableBuilder(listenable: widget.study,
    builder: (context, _) => MaterialApp(
      title: 'ElimuAI', debugShowCheckedModeBanner: false,
      theme: appTheme(false), darkTheme: appTheme(true),
      themeMode: widget.study.dark ? ThemeMode.dark : ThemeMode.light,
      home: FutureBuilder(future: initialization, builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const SplashScreen();
        }
        if (snapshot.hasError) {
          return Scaffold(body: Center(child: Notice('Unable to initialize device storage: ${snapshot.error}')));
        }
        if (!widget.study.onboardingSeen) return Onboarding(study: widget.study);
        if (!widget.study.signedIn) return SignIn(study: widget.study);
        final mustReset = widget.study.user?['must_reset_password'] == true;
        return mustReset ? ForcePasswordReset(study: widget.study) : StudyShell(study: widget.study);
      }),
    ));
}
