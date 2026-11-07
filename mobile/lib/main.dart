import 'package:flutter/material.dart';

import 'api.dart';
import 'screens.dart';
import 'sign_in.dart';
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
  late final Future<void> initialization = widget.study.initialize();
  @override
  Widget build(BuildContext context) => ListenableBuilder(listenable: widget.study,
    builder: (context, _) => MaterialApp(
      title: 'ElimuAI', debugShowCheckedModeBanner: false,
      theme: appTheme(false), darkTheme: appTheme(true),
      themeMode: widget.study.dark ? ThemeMode.dark : ThemeMode.light,
      home: FutureBuilder(future: initialization, builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.hasError) {
          return Scaffold(body: Center(child: Notice('Unable to initialize device storage: ${snapshot.error}')));
        }
        return widget.study.signedIn ? StudyShell(study: widget.study) : SignIn(study: widget.study);
      }),
    ));
}
