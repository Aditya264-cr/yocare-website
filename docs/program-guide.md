# Yocare Live program guide

Yocare Live can display current and upcoming program cards when it has a schedule feed. The IPTV channel playlists provide channel names, logos, categories and stream URLs; they do not provide the program schedule or show artwork. The UI therefore leaves the schedule empty until a guide is configured.

## Data file

Publish a JSON file at `public/data/guide.json` using this shape:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-10-29T09:00:00Z",
  "timezone": "UTC",
  "channels": {
    "ExampleChannel.uk": {
      "programs": [
        {
          "title": "Program title",
          "description": "Optional synopsis",
          "image": "https://cdn.example.com/program-art.jpg",
          "start": "2026-10-29T09:00:00Z",
          "end": "2026-10-29T10:00:00Z"
        }
      ]
    }
  }
}
```

- Each key in `channels` must match the channel's playlist `tvg-id` exactly (case-insensitive).
- `start` and `end` must be ISO 8601 timestamps with a UTC offset. The browser uses these timestamps to determine the current show and its progress.
- `image` is optional. Use artwork you have permission to display; the channel logo is used as a fallback.
- Keep the feed small: include current and upcoming programs only, and refresh it on a schedule appropriate to the guide provider.
- The page checks this file when it loads or when the selected country changes. It refreshes the on-air row every minute.

## Connecting a real EPG

Use a schedule feed for the channels Yocare is authorized to distribute, then map its XMLTV or JSON records to the playlist `tvg-id` values and publish the normalized JSON above. IPTV-org's EPG tooling can collect schedules from supported guide sites and export XML or JSON, but source coverage varies and the guide must be generated, hosted and mapped to channel IDs. The playlist repository itself is not a reliable source of current show names, times or artwork.

For a production setup, run the guide collector as a scheduled server-side job and publish the generated JSON as a static asset or through an authenticated Yocare API. Do not download large XMLTV feeds in each viewer's browser. Confirm each EPG source's terms and artwork rights before using it.
