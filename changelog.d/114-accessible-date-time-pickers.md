Phase W7: accessible date and time pickers
([issue #114](https://github.com/DocForum/docforum-web/issues/114)).
`DatePicker` follows the WAI-ARIA date picker dialog pattern (typed entry in
the locale's order or ISO, modal month grid with full keyboard support,
min/max and disabled days, "today" in an explicit IANA zone, 44px targets);
`TimePicker` is a combobox with typed entry (`14:30`, `2:30 pm`, `1430`) and
stepped suggestions, stating its zone. Both keep native value formats
(`YYYY-MM-DD`, `HH:mm`) and replace every native date, time and
datetime-local input in the app. Stories in `DatePicker.stories.tsx`.
