"""Welcome picker — TUI to choose Record / Transcribe / View at app startup."""

from __future__ import annotations

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.widgets import ListItem, ListView, Static


_MODES = [
    ('record', 'Record', 'Live transcription with AI digest'),
    ('transcribe', 'Transcribe', 'Transcribe an existing audio file'),
    ('view', 'View', 'Browse previously saved sessions'),
]


class ModeItem(ListItem):
    """Selectable row representing a launch mode."""

    def __init__(self, mode: str, label: str, description: str) -> None:
        super().__init__()
        self.mode = mode
        self._label_text = f'[bold]{label}[/bold]  [dim]{description}[/dim]'

    def compose(self) -> ComposeResult:
        yield Static(self._label_text, markup=True)


class WelcomePicker(App[str | None]):
    CSS = """
    #welcome-header {
        dock: top;
        height: 1;
        background: $primary;
        color: $text;
        text-align: center;
        text-style: bold;
        padding: 0 1;
    }
    #welcome-footer {
        dock: bottom;
        height: 1;
        background: $surface;
        color: $text-muted;
        text-align: center;
        padding: 0 1;
    }
    #welcome-list {
        border: solid $primary;
        margin: 1 2;
    }
    #welcome-list Static {
        height: 1;
        overflow: hidden hidden;
    }
    """

    BINDINGS = [
        Binding('escape', 'cancel', 'Cancel', priority=True),
        Binding('q', 'cancel', 'Cancel'),
        Binding('enter', 'select_mode', 'Select', priority=True),
    ]

    def compose(self) -> ComposeResult:
        yield Static('  lazy-take-notes', id='welcome-header')
        yield ListView(
            *[ModeItem(m, l, d) for m, l, d in _MODES],
            id='welcome-list',
        )
        yield Static(
            '\\[Enter] Select  \\[\u2191/\u2193] Navigate  \\[Esc] Cancel',
            id='welcome-footer',
            markup=True,
        )

    def on_mount(self) -> None:
        self.query_one('#welcome-list', ListView).focus()

    def action_select_mode(self) -> None:
        lv = self.query_one('#welcome-list', ListView)
        item = lv.highlighted_child
        if isinstance(item, ModeItem):
            self.exit(item.mode)

    def action_cancel(self) -> None:
        self.exit(None)
