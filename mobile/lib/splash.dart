import 'package:flutter/material.dart';

import 'ui.dart';

/// Branded animated splash shown while the app initializes.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..forward();

  @override
  void dispose() { controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final fade = CurvedAnimation(parent: controller, curve: const Interval(0, .6, curve: Curves.easeOut));
    final pop = CurvedAnimation(parent: controller, curve: const Interval(0, .7, curve: Curves.elasticOut));
    return Scaffold(body: DecoratedBox(
      decoration: const BoxDecoration(gradient: brandGradient),
      child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        ScaleTransition(scale: Tween(begin: .6, end: 1.0).animate(pop),
          child: FadeTransition(opacity: fade, child: Container(
            width: 104, height: 104,
            decoration: BoxDecoration(color: Colors.white,
              borderRadius: BorderRadius.circular(30),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .25), blurRadius: 30, offset: const Offset(0, 14))]),
            child: const Icon(Icons.auto_stories_rounded, color: purple, size: 56)))),
        const SizedBox(height: 26),
        FadeTransition(opacity: fade, child: Row(mainAxisAlignment: MainAxisAlignment.center, children: const [
          Text('Elimu', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: Colors.white)),
          Text('AI', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: sunshine)),
        ])),
        const SizedBox(height: 10),
        FadeTransition(opacity: fade, child: Text('Learning, reimagined for Africa.',
          style: TextStyle(color: Colors.white.withValues(alpha: .85), fontSize: 14, fontWeight: FontWeight.w500))),
        const SizedBox(height: 44),
        FadeTransition(opacity: fade, child: SizedBox(width: 30, height: 30,
          child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white.withValues(alpha: .9)))),
      ])),
    ));
  }
}
