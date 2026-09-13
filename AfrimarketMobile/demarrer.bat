@echo off
set PATH=C:\nodejs\node-v20.17.0-win-x64;%PATH%
cd /d C:\Users\lompo\Downloads\amazon_clone-main\AfrimarketMobile

echo ============================================================
echo   AFRI MARKET - DEMARRAGE
echo ============================================================
echo.
echo IMPORTANT avant d'acceder depuis le telephone :
echo   1) Votre telephone doit etre sur le MEME WIFI que ce PC
echo   2) Expo Go doit etre a jour (Play Store) - SDK 57 requis
echo   3) Dans Expo Go : scannez le QR code OU saisissez l'URL
echo      affichee ci-dessous (sous "Metro waiting on exp://...")
echo.
echo Si l'app ne charge pas malgre tout :
echo   - appuyez sur la touche  t  dans CE menu pour passer en
echo     mode TUNNEL (fonctionne meme sans WIFI partage),
echo   - ou frappez  r  pour recharger,  j  pour ouvrir Expo Go.
echo ============================================================
echo.
npx expo start --lan --clear
pause