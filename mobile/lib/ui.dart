import 'package:flutter/material.dart';

const purple = Color(0xFF8538D6);
const emerald = Color(0xFF16856A);
const orange = Color(0xFFE86C36);
const sunshine = Color(0xFFFFCF5C);
const sky = Color(0xFF307FCA);

ThemeData appTheme(bool dark) {
  final scheme = ColorScheme.fromSeed(seedColor: emerald,
    brightness: dark ? Brightness.dark : Brightness.light).copyWith(
      primary: dark ? const Color(0xFF75DBBC) : emerald,
      secondary: dark ? const Color(0xFFFFCF5C) : orange,
      tertiary: dark ? const Color(0xFFCFABF5) : purple,
      surface: dark ? const Color(0xFF182620) : const Color(0xFFF3FAF5),
    );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: dark ? const Color(0xFF101D19) : const Color(0xFFEAF5EF),
    fontFamily: 'Manrope',
    textTheme: ThemeData(brightness: dark ? Brightness.dark : Brightness.light).textTheme
      .apply(fontFamily: 'Manrope', bodyColor: dark ? const Color(0xFFF3F2F6) : const Color(0xFF242331),
      displayColor: dark ? Colors.white : const Color(0xFF242331)),
    appBarTheme: AppBarTheme(centerTitle: false, scrolledUnderElevation: 0,
      backgroundColor: dark ? const Color(0xFF182620) : const Color(0xFFD8EDE0)),
    inputDecorationTheme: InputDecorationTheme(
      filled: true, fillColor: dark ? const Color(0xFF233B32) : const Color(0xFFE1EEE8),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.all(17),
    ),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(
      minimumSize: const Size(48, 52),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
    )),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: scheme.surface,
      indicatorColor: sunshine,
      labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
    ),
    dividerTheme: DividerThemeData(color: scheme.outlineVariant.withValues(alpha: .5)),
  );
}

class Brand extends StatelessWidget {
  const Brand({super.key, this.compact = false});
  final bool compact;
  @override
  Widget build(BuildContext context) => FittedBox(fit: BoxFit.scaleDown,
    alignment: Alignment.centerLeft, child: Row(mainAxisSize: MainAxisSize.min, children: [
    Container(width: 38, height: 38, decoration: BoxDecoration(color: purple,
      borderRadius: BorderRadius.circular(8)),
      child: const Icon(Icons.auto_stories_rounded, color: Colors.white, size: 23)),
    const SizedBox(width: 10),
    Text('Elimu', style: TextStyle(fontSize: compact ? 22 : 27, fontWeight: FontWeight.w900)),
    Text('AI', style: TextStyle(fontSize: compact ? 22 : 27, color: purple, fontWeight: FontWeight.w900)),
  ]));
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.action, this.onAction});
  final String title;
  final String? action;
  final VoidCallback? onAction;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 22, bottom: 12),
    child: Row(children: [Expanded(child: Text(title,
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
      if (action != null) TextButton(onPressed: onAction, child: Text(action!)),
    ]),
  );
}

class Notice extends StatelessWidget {
  const Notice(this.text, {super.key, this.onRetry, this.icon = Icons.info_outline});
  final String text;
  final VoidCallback? onRetry;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.symmetric(vertical: 10), padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF334535) : const Color(0xFFFFEDB7),
      borderRadius: BorderRadius.circular(8)),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 20), const SizedBox(width: 10),
      Expanded(child: Text(text, style: const TextStyle(height: 1.5))),
      if (onRetry != null) IconButton(onPressed: onRetry,
        tooltip: 'Try again', icon: const Icon(Icons.refresh_rounded)),
    ]),
  );
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, required this.subtitle});
  final IconData icon;
  final String title;
  final String subtitle;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
    child: Column(children: [Icon(icon, size: 44, color: purple), const SizedBox(height: 16),
      Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
      const SizedBox(height: 8), Text(subtitle, textAlign: TextAlign.center,
        style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, height: 1.6)),
    ]));
}

(IconData, Color) subjectVisual(String subject) {
  final name = subject.toLowerCase();
  if (name.contains('math')) return (Icons.calculate_outlined, purple);
  if (name.contains('science') || name.contains('biology')) return (Icons.science_outlined, emerald);
  if (name.contains('swahili')) return (Icons.forum_outlined, orange);
  if (name.contains('english')) return (Icons.menu_book_rounded, const Color(0xFF397AC5));
  return (Icons.auto_stories_outlined, const Color(0xFFB04683));
}

class SubjectIcon extends StatelessWidget {
  const SubjectIcon(this.subject, {super.key, this.size = 46});
  final String subject;
  final double size;
  @override
  Widget build(BuildContext context) {
    final (icon, color) = subjectVisual(subject);
    return Container(width: size, height: size,
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
      child: Icon(icon, color: Colors.white, size: size * .5));
  }
}