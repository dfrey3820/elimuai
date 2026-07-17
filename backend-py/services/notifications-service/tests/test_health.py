from app.worker import TOPICS


def test_topics_declared():
    assert "user.registered" in TOPICS
    assert "payment.completed" in TOPICS
