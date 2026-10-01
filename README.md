# BestKabu Browser Extension
A Simple Browser extension that makes Digikabu.de better. This is a Fork of [@ouihq](https://github.com/ouihq/betterKabu)

# Usage

### Chromium: [here](https://chromewebstore.google.com/detail/bestkabu/okajcjigbfoadcmmhckdpbopohdkhcpg)
### Firefox*: Use the .xpi file in the latest -fire release
**Note:** If you find a relayable way to install the Extension on Firefox on andorid, please let me know. It already should work fine in debugger mode.

**Hint:** On some browsers the Extension shows the link to digikabu.de even if you're on the website. Please check your Privacy settings and Extension permissions.

## Subjects (Fächer)
Open the extension on the timetable or the Termine page: every subject of the page gets a colour, an own display name
(e.g. "AEuP" → "Web") and a checkbox to hide it from the timetable. Click **Speichern** to apply.

**Note:** Please submit (create an github issue) your school lesson abbreviations to set presets for the color.

## Login by Extension

### With Encryption:
1. Open the extension on the digikabu.de website.
2. Enable Auto-Login
3. Check the "Mit Passwort schützen" option.
4. Enter your username, password, and an encryption key (Note: using a key longer than your credentials is unnecessary).
5. Click the "Speichern" button.
   
**Note:** If no username or password is entered, the existing credentials won't be overwritten.

**To log in:** 
- Open the extension, enter your encryption key, and click "Einloggen" (or press Enter).

### Without Encryption:
1. Open the extension on the digikabu.de website.
2. Enable Auto-Login
3. Enter your username and password.
4. Click the "Speichern" button.
   
**Note:** If no username or password is entered, the existing credentials won't be overwritten.

## Preview
![](./screenshots/schedule.png)

## Accent colour
Open the extension on digikabu.de and pick a preset, use the colour wheel or enter a HEX code (`#rrggbb`).

## Current features:
- New look in the style of kabuProxy: own top bar, cards, light/dark/system mode
  (popup or the moon button), accent colour
- Timetable as a week grid (desktop) / day cards (mobile), breaks shown as gaps, "jetzt" marker on the running lesson,
  finished lessons and past days faded, changed/cancelled lessons highlighted, week switching without page reload
- Countdown to the end of the running and the start of the next lesson, Mebis button
- "N Änderungen seit deinem letzten Besuch" per week (snapshot in the browser), "Gesehen" to acknowledge
- Click a lesson to highlight all lessons of that subject + teacher (Esc to clear)
- Holidays/exams from the Schulaufgabenplan on the timetable's day heads and free days
- Termine page: today's lessons as a day card + "Aktuelle Termine" with exams marked
- Schulaufgabenplan as exam cards + month lists, school/holiday ranges merged, "Ab heute" / "Ganzes Jahr"
- Fehlzeiten as summary tiles + list with excused state
- Subject colours, own names and hidden subjects
- Login by Extension (optionally encrypted); a rejected login is not retried
- Open tabs refresh themselves after 15 minutes

# Contribution Guide

## Intro

If you want to contribute, you are free to do so. If you have any questions, you are free to do so. If you have found issues oder want to suggest features, you can submit that in GitHub.

## General

For anything, create a pull request with the naming scheme (featue/…  |  fix/…   | refactor/…) and if avalible the reference to the issue, and we test it, or change some things and then merge it into main. For git commit messages please follow this guide: https://www.conventionalcommits.org/en/v1.0.0/. And the commit git e-mail should be the same as your GitHub e-mail. For further questions, please contact us.

### Note
The Makefile is for packaging and only works on Linux. Just ignore it if you're not experienced.

#### Firefox

    $ make pack-fire

#### Chromium

    $ make pack-chr


# Warranty
** We don't provide any sort of warranty on this programm **

**contact: mikatechs@protonmail.com**


\* the update server is currently offline

## Contributors ✨

<p>Thanks to all the contributors who helped improve this project:</p>
<a href="https://github.com/Random-user420/bestKabu/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Random-user420/bestKabu" />
</a>

# Copyright
For Everything that is comitted under "Random-user420"

(C) 2025 Mika

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
