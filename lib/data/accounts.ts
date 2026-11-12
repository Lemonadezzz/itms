import { connectDB } from '@/lib/db/mongoose';
import { Employee } from '@/models/Employee';
import { User } from '@/models/User';

export type AccountStatus = 'Active' | 'Inactive' | 'No Account';

export type AccountRow = {
  /** Employee id for employee-backed rows, user id for standalone system accounts. */
  _id: string;
  kind: 'employee' | 'system';
  name: string;
  email: string;
  department: string;
  employeeId?: string;
  accountId?: string;
  accountEmail?: string;
  roleKey?: string;
  status: AccountStatus;
};

export async function getAccounts({
  page = 0,
  pageSize = 50,
  search = '',
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<{ rows: AccountRow[]; total: number }> {
  await connectDB();

  const [employees, users] = await Promise.all([
    Employee.find({}, { employeeName: 1, email: 1, department: 1 })
      .sort({ employeeName: 1 })
      .lean(),
    User.find({}, { name: 1, email: 1, employeeId: 1, roleKey: 1, status: 1 }).lean(),
  ]);

  const accountByEmployee = new Map<string, (typeof users)[number]>();
  const standalone: (typeof users)[number][] = [];

  for (const user of users) {
    if (user.employeeId) accountByEmployee.set(user.employeeId.toString(), user);
    else standalone.push(user);
  }

  const rows: AccountRow[] = employees.map((employee) => {
    const id = employee._id.toString();
    const account = accountByEmployee.get(id);
    return {
      _id: id,
      kind: 'employee',
      name: employee.employeeName,
      email: employee.email ?? '',
      department: employee.department || '—',
      employeeId: id,
      accountId: account?._id.toString(),
      accountEmail: account?.email,
      roleKey: account?.roleKey,
      status: account ? (account.status ?? 'Active') : 'No Account',
    };
  });

  for (const user of standalone) {
    rows.push({
      _id: user._id.toString(),
      kind: 'system',
      name: user.name,
      email: user.email,
      department: '—',
      accountId: user._id.toString(),
      accountEmail: user.email,
      roleKey: user.roleKey,
      status: user.status ?? 'Active',
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));

  const term = search.trim().toLowerCase();
  const filtered = term
    ? rows.filter((row) =>
        [row.name, row.email, row.department, row.roleKey ?? ''].some((value) =>
          value.toLowerCase().includes(term)
        )
      )
    : rows;

  const start = page * pageSize;
  return { rows: filtered.slice(start, start + pageSize), total: filtered.length };
}
