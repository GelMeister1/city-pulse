; Extra uninstall steps for City Pulse (included by electron-builder's NSIS installer).
; Removing the app also removes its "Start with Windows" entry, so nothing is left pointing at a deleted exe.
; Upgrades run the old uninstaller too, so skip this when updating: the new version keeps the user's choice.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CityPulse"
  ${endIf}
!macroend
