## [6.0.5] - 09-05-2025

## New 
- None

## Enhancements
- Updated the sample app to handle back button visibility using the `showBackButton` prop instead of relying on CSS for mobile view.

## Fixes
- None

## [6.0.4] - 25-04-2025

## New 
- None

## Enhancements
- None

## Fixes
- Resolved a problem where the input field remained active when the backdrop was open for password entry in password-protected groups.
- Fixed an issue where the group owner scope was not updating when a user left a password-protected group.

## [6.0.3] - 11-04-2025

## New
- None

## Enhancements
- None

## Fixes
- Fixed an issue where the info page in the React Sample App did not close after creating a new group.
- Fixed the issue where deleting a chat did not work for newly created conversations.
- Resolved the visibility issue of the transfer ownership modal on some mobile devices.
- Corrected the visibility of the "Leave group" option in the Sample App when the owner is the only member in the group.
- Resolved an issue where group options and scope were not updated for the logged-in user after transferring group ownership.

## [6.0.2] - 28-03-2025

## New
- None

## Enhancements
- None

## Fixes
- Fixed an issue where the unblock user option was not visible in Threads after blocking a user.
- Fixed an issue where an error occurred when logging in with a new user after logging out while a conversation was open.
- Addressed security vulnerabilities encountered when installing packages.

## [6.0.1] - 13-03-2025

## New
- None

## Enhancements
- None

## Fixes
 - Resolved an issue where a **group owner** lost the "Delete & Exit" and "Add Members" options after removing a member who later rejoined the group.
 - Resolved an issue where previously created group names and password suggestions appeared when creating a **new password-protected group**.

## [6.0.0] - 14-02-2025  

## New
- Added support for new languages: Italian, Japanese, Korean, Turkish, and Dutch.
- Added date localization support using `CometChatLocalize` for consistent datetime formatting.

## Enhancements
- Refactored localization handling to align with the updated `CometChatLocalization` class.

## Fixes
- None  

## Removals
- None

## Deprecations
- None 