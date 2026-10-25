"""State machine managing bot runtime lifecycle and operator controls."""

import logging
from datetime import datetime, timezone
from typing import Optional
from backend.models import BotState

logger = logging.getLogger("edgepilot.state_machine")


class BotStateMachine:
    """Thread-safe state machine governing bot operating modes."""

    def __init__(self, initial_state: BotState = BotState.INITIALIZING):
        self._current_state: BotState = initial_state
        self._state_reason: str = "System startup"
        self._updated_at: datetime = datetime.now(timezone.utc)

    @property
    def current_state(self) -> BotState:
        return self._current_state

    @property
    def state_reason(self) -> str:
        return self._state_reason

    @property
    def updated_at(self) -> datetime:
        return self._updated_at

    def can_transition_to(self, target: BotState) -> bool:
        current = self._current_state
        if current == target:
            return True

        if current == BotState.INITIALIZING:
            return target in (BotState.READY, BotState.ERROR, BotState.HALTED)
        elif current == BotState.READY:
            return target in (BotState.RUNNING, BotState.PAUSED, BotState.HALTED, BotState.ERROR)
        elif current == BotState.RUNNING:
            return target in (BotState.PAUSED, BotState.HALTED, BotState.ERROR)
        elif current == BotState.PAUSED:
            return target in (BotState.RUNNING, BotState.HALTED, BotState.ERROR)
        elif current == BotState.HALTED:
            return target in (BotState.READY, BotState.INITIALIZING)
        elif current == BotState.ERROR:
            return target in (BotState.READY, BotState.HALTED, BotState.INITIALIZING)
        return False

    def transition(self, target: BotState, reason: str = "") -> bool:
        if not self.can_transition_to(target):
            logger.warning(f"Illegal transition {self._current_state.value} -> {target.value}. Reason: {reason}")
            return False

        old = self._current_state
        self._current_state = target
        self._state_reason = reason
        self._updated_at = datetime.now(timezone.utc)
        logger.info(f"State transition: {old.value} -> {target.value} | Reason: {reason}")
        return True

    def pause(self, reason: str = "Operator paused bot") -> bool:
        return self.transition(BotState.PAUSED, reason)

    def resume(self, reason: str = "Operator resumed bot") -> bool:
        return self.transition(BotState.RUNNING, reason)

    def halt(self, reason: str = "Operator emergency kill switch activated") -> bool:
        return self.transition(BotState.HALTED, reason)

    def set_error(self, reason: str = "System error encountered") -> bool:
        return self.transition(BotState.ERROR, reason)

    def set_ready(self, reason: str = "System ready for trading") -> bool:
        return self.transition(BotState.READY, reason)

