import 'package:flutter/material.dart';

import 'study.dart';
import 'ui.dart';

class _Slide {
  const _Slide(this.icon, this.gradient, this.title, this.body, this.chips);
  final IconData icon;
  final LinearGradient gradient;
  final String title;
  final String body;
  final List<String> chips;
}

const _slides = <_Slide>[
  _Slide(Icons.auto_awesome_rounded, brandGradient,
    'Your AI tutor,\nday or night',
    'Ask anything, snap a tricky question, and get patient step-by-step help in English or Kiswahili.',
    ['Photo Scan', 'Homework lab', 'Exam practice']),
  _Slide(Icons.insights_rounded, heroGradient,
    'Progress you\ncan actually see',
    'Streaks, XP and subject strengths turn everyday effort into momentum students are proud of.',
    ['Streaks', 'Achievements', 'Leaderboards']),
  _Slide(Icons.diversity_3_rounded, sunriseGradient,
    'Built for families\n& classrooms',
    'Parents follow their children, teachers manage classes, and schools get the whole picture.',
    ['Parents', 'Teachers', 'Schools']),
];

class Onboarding extends StatefulWidget {
  const Onboarding({super.key, required this.study});
  final Study study;
  @override
  State<Onboarding> createState() => _OnboardingState();
}

class _OnboardingState extends State<Onboarding> {
  final controller = PageController();
  int index = 0;

  @override
  void dispose() { controller.dispose(); super.dispose(); }

  bool get isLast => index == _slides.length - 1;

  void next() {
    if (isLast) { widget.study.completeOnboarding(); return; }
    controller.nextPage(duration: const Duration(milliseconds: 350), curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    final onVariant = Theme.of(context).colorScheme.onSurfaceVariant;
    return Scaffold(body: SafeArea(child: Column(children: [
      Align(alignment: Alignment.centerRight, child: Padding(padding: const EdgeInsets.fromLTRB(0, 8, 8, 0),
        child: TextButton(onPressed: widget.study.completeOnboarding,
          child: Text(isLast ? '' : 'Skip')))),
      Expanded(child: PageView.builder(controller: controller, itemCount: _slides.length,
        onPageChanged: (value) => setState(() => index = value),
        itemBuilder: (context, i) {
          final slide = _slides[i];
          return Padding(padding: const EdgeInsets.symmetric(horizontal: 30), child: Column(
            mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 176, height: 176,
              decoration: BoxDecoration(gradient: slide.gradient, shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: slide.gradient.colors.last.withValues(alpha: .35),
                  blurRadius: 40, offset: const Offset(0, 18))]),
              child: Icon(slide.icon, size: 86, color: Colors.white))),
            const SizedBox(height: 44),
            Text(slide.title, style: const TextStyle(fontSize: 30, height: 1.2, fontWeight: FontWeight.w900)),
            const SizedBox(height: 14),
            Text(slide.body, style: TextStyle(fontSize: 15, height: 1.6, color: onVariant)),
            const SizedBox(height: 20),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final chip in slide.chips) Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: slide.gradient.colors.first.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(30)),
                child: Text(chip, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                  color: slide.gradient.colors.first))),
            ]),
          ]));
        })),
      Padding(padding: const EdgeInsets.fromLTRB(30, 10, 30, 26), child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (var i = 0; i < _slides.length; i++) AnimatedContainer(
            duration: const Duration(milliseconds: 250), margin: const EdgeInsets.symmetric(horizontal: 4),
            width: i == index ? 26 : 8, height: 8,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(4),
              color: i == index ? purple : purple.withValues(alpha: .2))),
        ]),
        const SizedBox(height: 24),
        SizedBox(width: double.infinity, child: FilledButton(onPressed: next,
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(isLast ? 'Get started' : 'Next'), const SizedBox(width: 8),
            const Icon(Icons.arrow_forward_rounded, size: 19)]))),
      ])),
    ])));
  }
}
