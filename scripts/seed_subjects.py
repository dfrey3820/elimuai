#!/usr/bin/env python3
"""Seed the `subjects` table from the frontend CURRICULA constants.

Runs one `aws ecs execute-command` per (country, curriculum, grade_level) group
so each SQL statement stays well under the ECS exec command size limit.
"""
from __future__ import annotations

import shlex
import subprocess
import sys

CURRICULA = {
    "KE": {
        "curriculum": "CBC",
        "levels": {
            "Grade 1": ["Literacy", "Kiswahili", "Mathematics", "Environmental", "Creative Arts", "Religious Education"],
            "Grade 2": ["English", "Kiswahili", "Mathematics", "Environmental", "Creative Arts", "Religious Education"],
            "Grade 3": ["English", "Kiswahili", "Mathematics", "Science & Technology", "Social Studies", "Creative Arts", "Religious Education"],
            "Grade 4": ["English", "Kiswahili", "Mathematics", "Science & Technology", "Social Studies", "Creative Arts", "Religious Education", "Agriculture"],
            "Grade 5": ["English", "Kiswahili", "Mathematics", "Science & Technology", "Social Studies", "Creative Arts", "Religious Education", "Agriculture"],
            "Grade 6": ["English", "Kiswahili", "Mathematics", "Science & Technology", "Social Studies", "Creative Arts", "Religious Education", "Agriculture"],
            "Grade 7 (JSS)": ["English", "Kiswahili", "Mathematics", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Creative Arts", "Agriculture", "Financial Literacy"],
            "Grade 8 (JSS)": ["English", "Kiswahili", "Mathematics", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Creative Arts", "Agriculture", "Financial Literacy"],
            "Grade 9 (JSS)": ["English", "Kiswahili", "Mathematics", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Creative Arts", "Agriculture", "Financial Literacy"],
        },
    },
    "TZ": {
        "curriculum": "NECTA",
        "levels": {
            "Standard 1": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT"],
            "Standard 2": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT"],
            "Standard 3": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
            "Standard 4": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
            "Standard 5": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
            "Standard 6": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
            "Standard 7": ["Kiswahili", "English", "Mathematics", "Science & Technology", "Social Studies", "ICT", "Vocational Skills"],
            "Form 1": ["Kiswahili", "English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Civics", "ICT"],
            "Form 2": ["Kiswahili", "English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Civics", "Commerce"],
            "Form 3": ["Kiswahili", "English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Civics", "Book Keeping"],
            "Form 4": ["Kiswahili", "English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Civics", "Commerce", "Book Keeping"],
        },
    },
    "UG": {
        "curriculum": "NCDC",
        "levels": {
            "Primary 1": ["Literacy 1", "Literacy 2 (Local Lang)", "Numeracy", "Elementary Science", "Religious Education", "Physical Education"],
            "Primary 2": ["Literacy 1", "Literacy 2", "Numeracy", "Elementary Science", "Social Studies", "Religious Education", "Creative Arts"],
            "Primary 3": ["English", "Local Language", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts"],
            "Primary 4": ["English", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts & Technology"],
            "Primary 5": ["English", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts & Technology"],
            "Primary 6": ["English", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts & Technology"],
            "Primary 7": ["English", "Mathematics", "Science", "Social Studies", "Religious Education", "Creative Arts & Technology"],
            "Senior 1": ["English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Religious Education", "Entrepreneurship", "ICT", "Fine Art"],
            "Senior 2": ["English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Religious Education", "Entrepreneurship", "ICT", "Commerce"],
            "Senior 3": ["English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Religious Education", "Entrepreneurship", "ICT", "Commerce"],
            "Senior 4": ["English", "Mathematics", "Biology", "Chemistry", "Physics", "History", "Geography", "Religious Education", "Entrepreneurship", "ICT", "Commerce"],
        },
    },
}


def run_ecs(task_arn: str, sql: str) -> None:
    cmd = [
        "aws", "ecs", "execute-command",
        "--cluster", "elimuai-cluster",
        "--task", task_arn,
        "--container", "postgres",
        "--interactive",
        "--region", "eu-west-1",
        "--command", f"psql -U elimuai_user -d elimuai_db -c {shlex.quote(sql)}",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("ERR:", r.stderr, file=sys.stderr)
        sys.exit(1)


def main() -> None:
    task_arn = subprocess.check_output([
        "aws", "ecs", "list-tasks",
        "--cluster", "elimuai-cluster",
        "--service", "elimuai-svc",
        "--region", "eu-west-1",
        "--query", "taskArns[0]",
        "--output", "text",
    ], text=True).strip()

    for country, spec in CURRICULA.items():
        curriculum = spec["curriculum"]
        for level, subjects in spec["levels"].items():
            values = ", ".join(
                f"('{s.replace(chr(39), chr(39)*2)}', '{country}', '{curriculum}', '{level.replace(chr(39), chr(39)*2)}')"
                for s in subjects
            )
            sql = (
                "INSERT INTO subjects (name, country, curriculum, grade_level) VALUES "
                f"{values} ON CONFLICT DO NOTHING;"
            )
            print(f"  seed {country} {curriculum} {level!r}: {len(subjects)} subjects")
            run_ecs(task_arn, sql)

    print("done")


if __name__ == "__main__":
    main()
