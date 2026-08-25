import re

with open('src/screens/SOSScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace("backgroundColor: '#090d16'", "backgroundColor: theme.colors.background")
content = content.replace("backgroundColor: '#0f172a'", "backgroundColor: theme.colors.surface")
content = content.replace("borderColor: '#1e293b'", "borderColor: theme.colors.border")

if "import { theme }" not in content:
    content = content.replace("import { SOSEvent }", "import { theme } from '../theme/theme';\nimport { SOSEvent }")

with open('src/screens/SOSScreen.tsx', 'w') as f:
    f.write(content)

with open('src/screens/EmergencyContactsScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace("backgroundColor: '#090d16'", "backgroundColor: theme.colors.background")
content = content.replace("backgroundColor: '#0f172a'", "backgroundColor: theme.colors.surface")
content = content.replace("borderColor: '#1e293b'", "borderColor: theme.colors.border")

if "import { theme }" not in content:
    content = content.replace("import { EmergencyContact", "import { theme } from '../theme/theme';\nimport { EmergencyContact")

with open('src/screens/EmergencyContactsScreen.tsx', 'w') as f:
    f.write(content)
