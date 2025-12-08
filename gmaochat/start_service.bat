@echo off
echo ===== Demarrage du service de chatbot GMAO =====
cd "%~dp0"
echo Installation des dependances...
pip install -r requirements.txt
echo.
echo Demarrage du service sur http://localhost:5002 ...
python gmao_chatbot_service.py