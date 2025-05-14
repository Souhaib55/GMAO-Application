@echo off
echo ===== Démarrage du service de chatbot GMAO =====
cd "%~dp0"
echo Installation des dépendances...
pip install -r requirements.txt
echo.
echo Démarrage du service sur http://localhost:5001 ...
python gmao_chatbot_service.py