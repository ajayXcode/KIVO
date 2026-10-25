from backend.models import BotState
from backend.state_machine import BotStateMachine


def test_state_machine_lifecycle():
    sm = BotStateMachine(BotState.INITIALIZING)
    assert sm.current_state == BotState.INITIALIZING

    assert sm.set_ready() is True
    assert sm.current_state == BotState.READY

    assert sm.resume() is True
    assert sm.current_state == BotState.RUNNING

    assert sm.pause() is True
    assert sm.current_state == BotState.PAUSED

    assert sm.resume() is True
    assert sm.current_state == BotState.RUNNING

    assert sm.halt() is True
    assert sm.current_state == BotState.HALTED

    assert sm.resume() is False
    assert sm.current_state == BotState.HALTED

