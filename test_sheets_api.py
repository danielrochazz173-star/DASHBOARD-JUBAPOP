from google.oauth2 import service_account
from googleapiclient.discovery import build

SERVICE_ACCOUNT_FILE = "c:/Users/Daniel/Documents/TESTE-COPILOT/tensile-proxy-468412-t2-00a4224fd88c.json"
SPREADSHEET_ID = "1kduUrKUo0bPbi8EJRtSrlef5m1ES8xB9y7CnasCQ2KU"

creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE,
    scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
)

service = build("sheets", "v4", credentials=creds)

sheet_meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
sheets = sheet_meta.get("sheets", [])
if not sheets:
    raise RuntimeError("No sheets found")

sheet_title = sheets[0]["properties"]["title"]
print("First sheet:", sheet_title)

range_name = f"{sheet_title}!A1:Z5"
values = (
    service.spreadsheets()
    .values()
    .get(spreadsheetId=SPREADSHEET_ID, range=range_name)
    .execute()
    .get("values", [])
)

print("Rows returned:", len(values))
for row in values:
    print(row)
