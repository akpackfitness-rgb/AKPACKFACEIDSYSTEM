import { APPS_SCRIPT_URL, SHEET_ID } from '../config';

export interface Member {
  membershipId: string;
  clientName: string;
  mobileNo: string;
  createdOn: string;
  packageDetails: string;
  packageValidity: string;
  startingDate: string;
  renewalDate: string;
  faceImage: string;
  faceEncoding: string;
  rowIndex?: number;
}

function parseGvizResponse(text: string): Record<string, string>[] {
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]);
    const cols: { label: string }[] = data.table.cols;
    const rows: { c: ({ v: string | number | null } | null)[] }[] = data.table.rows;
    return rows
      .filter((row) => row && row.c)
      .map((row) => {
        const obj: Record<string, string> = {};
        cols.forEach((col, i) => {
          const cell = row.c[i];
          obj[col.label] = cell && cell.v != null ? String(cell.v) : '';
        });
        return obj;
      });
  } catch {
    return [];
  }
}

function rowToMember(row: Record<string, string>, index: number): Member {
  return {
    membershipId: row['Membership ID'] || row['membershipId'] || row['MEMBERSHIP ID'] || '',
    clientName: row['Client Name'] || row['clientName'] || row['CLIENT NAME'] || '',
    mobileNo: row['Mobile No'] || row['mobileNo'] || row['MOBILE NO'] || '',
    createdOn: row['Created On'] || row['createdOn'] || '',
    packageDetails: row['Package Details'] || row['packageDetails'] || '',
    packageValidity: row['Package Validity'] || row['packageValidity'] || '',
    startingDate: row['Starting Date'] || row['startingDate'] || '',
    renewalDate: row['Renewal Date'] || row['renewalDate'] || '',
    faceImage: row['Face Image'] || row['faceImage'] || '',
    faceEncoding: row['Face Encoding'] || row['faceEncoding'] || '',
    rowIndex: index + 2,
  };
}

export async function getAllMembers(): Promise<Member[]> {
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
    const res = await fetch(gvizUrl);
    const text = await res.text();
    const rows = parseGvizResponse(text);
    return rows
      .map((row, i) => rowToMember(row, i))
      .filter((m) => m.membershipId !== '');
  } catch {
    const url = `${APPS_SCRIPT_URL}?action=getAll`;
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((row: Record<string, string>, i: number) => rowToMember(row, i));
    }
    return [];
  }
}

export async function getMemberById(membershipId: string): Promise<Member | null> {
  const members = await getAllMembers();
  return members.find((m) => m.membershipId.trim() === membershipId.trim()) ?? null;
}

export async function updateFaceData(
  membershipId: string,
  faceImage: string,
  faceEncoding: string
): Promise<boolean> {
  const payload = {
    action: 'updateFaceData',
    membershipId,
    faceImage,
    faceEncoding,
  };

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
      await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: formData });
      return true;
    } catch {
      return false;
    }
  }
}
