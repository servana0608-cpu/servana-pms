import React, { useState, useMemo, useEffect } from 'react';
import {
    LayoutDashboard,
    ConciergeBell,
    Calendar,
    Wallet,
    BarChart3,
    Bed,
    Settings,
    Search,
    Bell,
    ChevronRight,
    Plus,
    MoreVertical,
    CheckCircle2,
    Clock,
    User,
    Users,
    UserCheck,
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    Filter,
    Download,
    UserPlus,
    Moon,
    LogOut,
    Package,
    AlertTriangle,
    History,
    X,
    Save,
    ArrowLeft,
    Zap,
    FileText,
    RotateCw,
    Wrench,
    Brush,
    Wind,
    Info,
    Mail,
    CalendarClock,
    ClipboardList,
    Printer,
    Split,
    Receipt,
    Globe,
    Smartphone,
    MapPin,
    Camera,
    Upload,
    Trash2,
    Phone,
    Building2,
    Edit3,
    Shield,
    Percent,
    Timer,
    Building,
    Lock,
    Ban,
    MessageSquare,
    Star
} from 'lucide-react';

// -----------------------------
// Core PMS helpers (business date, permissions, audit log)
// -----------------------------
const LS_KEYS = {
    businessDate: "servana_businessDate",
    lockedDates: "servana_lockedDates",
    auditLog: "servana_auditLog",
};

const safeJsonParse = (v, fallback) => {
    try { return JSON.parse(v); } catch { return fallback; }
};

const loadLS = (key, fallback) => {
    if (typeof window === "undefined") return fallback;
    const v = window.localStorage.getItem(key);
    if (v === null || v === undefined) return fallback;
    return safeJsonParse(v, fallback);
};

const saveLS = (key, value) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
};

const toISODate = (d) => {
    const date = (d instanceof Date) ? d : new Date(d);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const addDaysISO = (iso, days) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + days);
    return toISODate(d);
};

const formatHumanDate = (iso) => {
    try {
        const d = new Date(`${iso}T00:00:00`);
        return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    } catch {
        return iso;
    }
};

const ROLE = {
    OWNER: "Owner",
    MANAGER: "Manager",
    FRONT_DESK: "Front Desk",
};

const PERMISSIONS = {
    BACKDATE_TXN: "BACKDATE_TXN",
    DAY_CLOSE: "DAY_CLOSE",
    REFUND: "REFUND",
    MARK_NO_SHOW: "MARK_NO_SHOW",
    AUDIT_OVERRIDE: "AUDIT_OVERRIDE",
};

const roleCan = (role, permission) => {
    if (role === ROLE.OWNER) return true;
    if (role === ROLE.MANAGER) {
        return [PERMISSIONS.DAY_CLOSE, PERMISSIONS.REFUND, PERMISSIONS.MARK_NO_SHOW].includes(permission);
    }
    if (role === ROLE.FRONT_DESK) return false;
    return false;
};

const createAuditEntry = ({ role, action, meta = {} }) => ({
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
    at: new Date().toISOString(),
    role,
    action,
    meta,
});

// Master list of available rooms and their assigned types
const MASTER_ROOMS = [
    { id: "101", type: "Standard Queen" },
    { id: "102", type: "Standard Queen" },
    { id: "201", type: "Deluxe King" },
    { id: "202", type: "Deluxe King" },
    { id: "401", type: "Executive King" },
    { id: "501", type: "Maharaja Suite" },
];

// --- Reusable UI Components ---

const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
        {children}
    </div>
);

const Badge = ({ children, status }) => {
    const styles = {
        available: "bg-emerald-100 text-emerald-700 border-emerald-200",
        occupied: "bg-blue-100 text-blue-700 border-blue-200",
        cleaning: "bg-amber-100 text-amber-700 border-amber-200",
        dirty: "bg-red-50 text-red-600 border-red-100",
        inspected: "bg-purple-100 text-purple-700 border-purple-200",
        confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
        pending: "bg-slate-100 text-slate-600 border-slate-200",
        low: "bg-red-50 text-red-600 border-red-100",
        sufficient: "bg-emerald-50 text-emerald-600 border-emerald-100",
        overdue: "bg-red-100 text-red-700 border-red-200",
        success: "bg-emerald-100 text-emerald-700 border-emerald-200",
        vip: "bg-indigo-100 text-indigo-700 border-indigo-200",
        blocked: "bg-slate-900 text-white border-slate-900",
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.pending}`}>
            {children}
        </span>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-8">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                    <h3 className="font-black text-xl text-slate-800 tracking-tight uppercase">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

// --- Module: Login Screen ---

const LoginScreen = ({ onLogin }) => {
    const [role, setRole] = useState('Owner');
    const [propertyId, setPropertyId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const accessCredentials = {
            'Owner': '123456',
            'Manager': '012345',
            'Front Desk': '901234'
        };

        if (propertyId === 'MASTER001' && password === accessCredentials[role]) {
            onLogin(role);
        } else {
            setError('Invalid Property ID or Password for the selected role.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md">
                <div className="text-center mb-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-200 ring-8 ring-blue-50 mx-auto">
                        <ShieldCheck size={40} />
                    </div>
                    <div>
                        <h1 className="font-black text-4xl leading-none tracking-tight text-slate-800">SERVANA</h1>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-[0.3em] mt-2">Boutique PMS Portal</p>
                    </div>
                </div>

                <Card className="p-10 shadow-2xl rounded-[2.5rem] border-0 animate-in zoom-in-95 duration-500">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access Role</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Owner', 'Manager', 'Front Desk'].map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all border-2 ${role === r
                                            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100"
                                            : "bg-slate-50 text-slate-400 border-transparent hover:border-slate-200"}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Property ID</label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    required
                                    type="text"
                                    placeholder="Enter Property ID"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                                    value={propertyId}
                                    onChange={(e) => setPropertyId(e.target.value.toUpperCase())}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Secret Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 animate-in shake duration-300">
                                <AlertTriangle size={18} className="text-red-500 shrink-0" />
                                <p className="text-[10px] font-bold text-red-600 uppercase leading-tight">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-[0.98]"
                        >
                            Authorize Access
                        </button>
                    </form>
                </Card>

                <p className="text-center mt-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Authorized Personnel Only • IP: MASTER001
                </p>
            </div>
        </div>
    );
};

// --- Module: Block Rooms ---

const BlockRoomsModule = ({ blockedRooms, onToggleBlock }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Block Rooms</h2>
                    <p className="text-slate-500 text-sm font-medium">Control inventory by restricting specific room units.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MASTER_ROOMS.map(room => {
                    const isBlocked = blockedRooms.includes(room.id);
                    return (
                        <Card key={room.id} className={`p-6 transition-all ${isBlocked ? 'border-slate-900 bg-slate-50' : 'hover:shadow-md'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{room.id}</span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{room.type}</p>
                                </div>
                                <Badge status={isBlocked ? 'blocked' : 'available'}>
                                    {isBlocked ? 'Blocked' : 'Open'}
                                </Badge>
                            </div>

                            <div className="pt-6 border-t border-slate-100 mt-4">
                                <button
                                    onClick={() => onToggleBlock(room.id)}
                                    className={`w-full py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${isBlocked
                                        ? 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
                                        }`}
                                >
                                    {isBlocked ? (
                                        <><RotateCw size={14} /> Open Room</>
                                    ) : (
                                        <><Ban size={14} /> Block Room</>
                                    )}
                                </button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

// --- Module: In-House Guests ---

const InHouseModule = ({ onShowFolio, searchQuery, userRole }) => {
    const [inHouseGuests, setInHouseGuests] = useState([
        { id: "RES-4401", guest: "Arjun Malhotra", room: "302", type: "Heritage Suite", phone: "+91 98765 43210", checkIn: "12 Oct", checkOut: "18 Oct", balance: 44650 },
        { id: "RES-4405", guest: "Vikram Singh", room: "501", type: "Maharaja Suite", phone: "+91 88888 77777", checkIn: "14 Oct", checkOut: "22 Oct", balance: 125000 },
        { id: "RES-4409", guest: "Ishita Patel", room: "102", type: "Standard Queen", phone: "+91 77777 66666", checkIn: "15 Oct", checkOut: "16 Oct", balance: 8500 },
        { id: "RES-4412", guest: "Siddharth Verma", room: "201", type: "Deluxe King", phone: "+91 99900 11122", checkIn: "13 Oct", checkOut: "15 Oct", balance: 28400 },
    ]);

    const handleDelete = (id) => {
        setInHouseGuests(inHouseGuests.filter(g => g.id !== id));
    };

    const filteredGuests = useMemo(() => {
        return inHouseGuests
            .filter(g => g.guest.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.guest.localeCompare(b.guest));
    }, [inHouseGuests, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">In-House Guests</h2>
                    <p className="text-slate-500 text-sm font-medium">Currently staying guests and live folio balances.</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
                        <Filter size={18} /> Filter List
                    </button>
                </div>
            </div>

            <Card className="overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest & Room</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Folio Balance</th>
                            <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredGuests.map((g) => (
                            <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-100">
                                            {g.room}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{g.guest}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{g.type}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-700">{g.checkIn} — {g.checkOut}</p>
                                        <p className="text-[10px] text-slate-400 font-medium italic">Res ID: {g.id}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <p className="text-lg font-black text-slate-800">₹{g.balance.toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Verified Account</p>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center justify-center gap-3">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
                                            <Edit3 size={14} /> Amend Stay
                                        </button>
                                        <button
                                            onClick={() => onShowFolio('ledger')}
                                            className="text-emerald-600 hover:text-emerald-800 text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-all"
                                        >
                                            <Receipt size={14} /> Folio
                                        </button>
                                        {userRole === 'Owner' && (
                                            <button onClick={() => handleDelete(g.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors" title="Delete record">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

// --- Module: Guest Database ---

const GuestDatabase = ({ searchQuery, userRole }) => {
    const [guests, setGuests] = useState([
        { id: "G-1001", name: "Arjun Malhotra", company: "TechCorp India", email: "arjun.m@gmail.com", phone: "+91 98765 43210", visits: 4, lastStay: "12 Oct 2023", idOnFiles: "Aadhar", status: "vip" },
        { id: "G-1002", name: "Priya Sharma", company: "", email: "priya.sharma@yahoo.com", phone: "+91 91234 56789", visits: 1, lastStay: "15 Oct 2023", idOnFiles: "Passport", status: "confirmed" },
        { id: "G-1003", name: "Vikram Singh", company: "Tata Group", email: "vikram.singh@outlook.com", phone: "+91 88888 77777", visits: 12, lastStay: "14 Oct 2023", idOnFiles: "Aadhar", status: "vip" },
        { id: "G-1004", name: "Ishita Patel", company: "Reliance Ind.", email: "ishita.p@gmail.com", phone: "+91 77777 66666", visits: 2, lastStay: "13 Oct 2023", idOnFiles: "Pan Card", status: "confirmed" },
    ]);

    const [showModal, setShowModal] = useState(false);
    const [newGuest, setNewGuest] = useState({ name: "", company: "", email: "", phone: "", idOnFiles: "Aadhar" });

    const handleAddGuest = (e) => {
        e.preventDefault();
        const id = `G-${1000 + guests.length + 1}`;
        setGuests([{ ...newGuest, id, visits: 1, lastStay: "New Guest", status: "confirmed" }, ...guests]);
        setShowModal(false);
        setNewGuest({ name: "", company: "", email: "", phone: "", idOnFiles: "Aadhar" });
    };

    const handleDelete = (id) => {
        setGuests(guests.filter(g => g.id !== id));
    };

    const filteredGuests = useMemo(() => {
        return guests
            .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.phone.includes(searchQuery))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [guests, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Register New Guest">
                <form onSubmit={handleAddGuest} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                        <input required type="text" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 shadow-sm focus:border-blue-500 outline-none" value={newGuest.name} onChange={e => setNewGuest({ ...newGuest, name: e.target.value })} placeholder="e.g. Rahul Verma" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name (If associated)</label>
                        <input type="text" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 shadow-sm focus:border-blue-500 outline-none" value={newGuest.company} onChange={e => setNewGuest({ ...newGuest, company: e.target.value })} placeholder="e.g. Tata Consultancy Services" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</label>
                            <input required type="tel" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 shadow-sm focus:border-blue-500 outline-none" value={newGuest.phone} onChange={e => setNewGuest({ ...newGuest, phone: e.target.value })} placeholder="+91" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                            <input required type="email" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 shadow-sm focus:border-blue-500 outline-none" value={newGuest.email} onChange={e => setNewGuest({ ...newGuest, email: e.target.value })} placeholder="guest@example.com" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default ID Type</label>
                        <select className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 outline-none appearance-none" value={newGuest.idOnFiles} onChange={e => setNewGuest({ ...newGuest, idOnFiles: e.target.value })}>
                            <option>Aadhar</option><option>Passport</option><option>Pan Card</option><option>Driving License</option>
                        </select>
                    </div>
                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase">Cancel</button>
                        <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all">Save Profile</button>
                    </div>
                </form>
            </Modal>

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Guest Profiles</h2>
                    <p className="text-slate-500 text-sm font-medium">Customer database and loyalty tracking.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                    <Plus size={18} /> Add New Guest
                </button>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            disabled
                            type="text"
                            placeholder="Use main search above..."
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium outline-none transition-all cursor-not-allowed opacity-60"
                            value={searchQuery}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2">
                            <Filter size={14} /> Filter
                        </button>
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-2">
                            <Download size={14} /> Export CRM
                        </button>
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50/80 border-b">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Info</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Details</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Visits</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documents on File</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Stay</th>
                            <th className="px-8 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredGuests.map((g) => (
                            <tr key={g.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-xs border-2 border-white shadow-sm">
                                            {g.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 flex items-center gap-2">
                                                {g.name}
                                                {g.visits > 3 && <Badge status="vip">Loyal</Badge>}
                                            </p>
                                            {g.company && (
                                                <div className="flex items-center gap-1 text-[10px] font-black text-blue-500 uppercase tracking-tighter mt-0.5">
                                                    <Building2 size={10} /> {g.company}
                                                </div>
                                            )}
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{g.id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                            <Mail size={12} className="text-slate-400" /> {g.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                            <Phone size={12} className="text-slate-400" /> {g.phone}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                        {g.visits}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-emerald-500" />
                                        <span className="text-xs font-bold text-slate-600">{g.idOnFiles} Verified</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <p className="text-xs font-bold text-slate-500">{g.lastStay}</p>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {userRole === 'Owner' && (
                                            <button onClick={() => handleDelete(g.id)} className="text-slate-300 hover:text-red-600 p-2 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        <button className="text-slate-300 hover:text-blue-600 transition-colors">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

// --- Module: Corporations ---

const CorporationsModule = ({ searchQuery, userRole }) => {
    const [corps, setCorps] = useState([
        { id: "CORP-001", name: "Tata Consultancy Services", gstin: "27AAACT9000C1Z2", email: "travel@tcs.com", phone: "+91 22 6778 9999", city: "Mumbai", dues: 185000 },
        { id: "CORP-002", name: "Reliance Industries", gstin: "24AAAAR1234A1Z5", email: "admin@ril.com", phone: "+91 22 2278 5000", city: "Ahmedabad", dues: 42000 },
        { id: "CORP-003", name: "Infosys Limited", gstin: "29AAACl1234A1Z1", email: "hospitality@infosys.com", phone: "+91 80 2852 0261", city: "Bangalore", dues: 98000 },
    ]);

    const [showModal, setShowModal] = useState(false);
    const [newCorp, setNewCorp] = useState({ name: "", gstin: "", email: "", phone: "", address: "", pan: "" });

    const handleAddCorp = (e) => {
        e.preventDefault();
        const id = `CORP-00${corps.length + 1}`;
        setCorps([{ ...newCorp, id, dues: 0, city: newCorp.address.split(',')[0] || "Jaipur" }, ...corps]);
        handleCancel();
    };

    const handleDelete = (id) => {
        setCorps(corps.filter(c => c.id !== id));
    };

    const handleCancel = () => {
        setShowModal(false);
        setNewCorp({ name: "", gstin: "", email: "", phone: "", address: "", pan: "" });
    };

    const filteredCorps = useMemo(() => {
        return corps
            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [corps, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Modal isOpen={showModal} onClose={handleCancel} title="Register New Corporation">
                <form onSubmit={handleAddCorp} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name (As per GST)</label>
                        <input required type="text" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 shadow-sm focus:border-blue-500 outline-none" value={newCorp.name} onChange={e => setNewCorp({ ...newCorp, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN Number</label>
                            <input required type="text" maxLength="15" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 focus:border-blue-500 outline-none" value={newCorp.gstin} onChange={e => setNewCorp({ ...newCorp, gstin: e.target.value.toUpperCase() })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PAN Card Number</label>
                            <input required type="text" maxLength="10" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 focus:border-blue-500 outline-none" value={newCorp.pan} onChange={e => setNewCorp({ ...newCorp, pan: e.target.value.toUpperCase() })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered Address</label>
                        <textarea required className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 focus:border-blue-500 outline-none h-20 resize-none" value={newCorp.address} onChange={e => setNewCorp({ ...newCorp, address: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Phone</label>
                            <input required type="tel" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 focus:border-blue-500 outline-none" value={newCorp.phone} onChange={e => setNewCorp({ ...newCorp, phone: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Email</label>
                            <input required type="email" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 focus:border-blue-500 outline-none" value={newCorp.email} onChange={e => setNewCorp({ ...newCorp, email: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button type="button" onClick={handleCancel} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm uppercase">Cancel</button>
                        <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all">Save Corporation</button>
                    </div>
                </form>
            </Modal>

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Corporations</h2>
                    <p className="text-slate-500 text-sm font-medium">Corporate credit accounts management.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                    <Plus size={18} /> Add New Corporation
                </button>
            </div>

            <Card className="overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company Name</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">GSTIN / City</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Info</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Outstanding Dues</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCorps.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                                            <Building2 size={20} />
                                        </div>
                                        <span className="font-bold text-slate-800">{c.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <p className="text-xs font-mono font-bold text-slate-700">{c.gstin}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{c.city}</p>
                                </td>
                                <td className="px-6 py-5 space-y-1">
                                    <p className="text-xs font-medium text-slate-600 flex items-center gap-2"><Mail size={12} /> {c.email}</p>
                                    <p className="text-xs font-medium text-slate-600 flex items-center gap-2"><Phone size={12} /> {c.phone}</p>
                                </td>
                                <td className="px-6 py-5 text-right font-black text-slate-800 text-lg">
                                    ₹{c.dues.toLocaleString('en-IN')}
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {userRole === 'Owner' && (
                                            <button onClick={() => handleDelete(c.id)} className="text-slate-300 hover:text-red-600 p-2 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        <button className="text-slate-300 hover:text-blue-600 transition-colors"><ChevronRight size={20} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

// --- Module: Monthly Reports ---

const MonthlyReportsModule = () => {
    const [selectedMonth, setSelectedMonth] = useState("October 2023");
    const reports = [
        { id: 'rev', title: "Revenue Summary", desc: "Detailed breakdown of room stay and service bills.", icon: Wallet, data: [["Date", "Description", "Amount"], ["2023-10-01", "Stay #302", "45000"]] },
        { id: 'occ', title: "Occupancy & ADR", desc: "Key metrics like Occupancy % and RevPAR.", icon: Bed, data: [["Date", "Occupancy %"], ["2023-10-01", "84%"]] },
        { id: 'gst', title: "GST Sales Register", desc: "Monthly tax report for filing GSTR-1.", icon: Receipt, data: [["Invoice #", "GSTIN", "Taxable Value", "Total GST"]] },
        { id: 'corp', title: "Corporation Dues Report", desc: "Outstanding monthly balances for corporate credit accounts.", icon: Building, data: [["Corp ID", "Company Name", "Monthly Total", "Status"], ["CORP-001", "Tata Consultancy Services", "185000", "Pending"], ["CORP-003", "Infosys Limited", "98000", "Pending"]] },
    ];

    const handleDownload = (report) => {
        let csvContent = "data:text/csv;charset=utf-8," + report.data.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${report.title.replace(/\s+/g, '_')}_${selectedMonth.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Monthly Reports</h2>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border rounded-xl px-4 py-2 text-sm font-bold outline-none cursor-pointer hover:border-blue-300 transition-all shadow-sm">
                    <option>October 2023</option><option>September 2023</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {reports.map((report) => (
                    <Card key={report.id} className="p-8 group hover:border-blue-200 transition-all flex flex-col justify-between shadow-sm">
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <report.icon size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">{report.title}</h3>
                                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{report.desc}</p>
                            </div>
                        </div>
                        <button onClick={() => handleDownload(report)} className="mt-8 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-blue-600 transition-all shadow-md group-active:scale-95">
                            <Download size={16} /> Download CSV
                        </button>
                    </Card>
                ))}
            </div>
        </div>
    );
};

// --- Module: Booking Source Analytics ---

const SourceAnalytics = () => {
    const sources = [
        { name: "MakeMyTrip", count: 42, revenue: 420000, color: "bg-blue-500", icon: Smartphone },
        { name: "Booking.com", count: 28, revenue: 280000, color: "bg-indigo-600", icon: Globe },
        { name: "Walk-in (Direct)", count: 55, revenue: 650000, color: "bg-emerald-500", icon: MapPin },
        { name: "Goibibo", count: 15, revenue: 150000, color: "bg-amber-500", icon: Wind },
    ];

    const totalRevenue = sources.reduce((acc, curr) => acc + curr.revenue, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Booking Source Analytics</h2>
                    <p className="text-slate-500 text-sm font-medium">Tracking ROI across OTAs and Walk-ins.</p>
                </div>
                <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                    <Download size={18} /> Export Data
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {sources.map(s => (
                    <Card key={s.name} className="p-6 overflow-hidden relative group cursor-default">
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${s.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg ${s.color.replace('bg-', 'bg-opacity-10 text-')}`}>
                                <s.icon size={20} className={s.color.replace('bg-', 'text-')} />
                            </div>
                            <p className="text-sm font-bold text-slate-700">{s.name}</p>
                        </div>
                        <p className="text-2xl font-black text-slate-800">₹{(s.revenue / 100000).toFixed(1)}L</p>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.count} Bookings</p>
                            <p className="text-xs font-black text-emerald-500">{Math.round((s.revenue / totalRevenue) * 100)}%</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-8">
                    <h3 className="font-bold text-slate-800 mb-6">Revenue Contribution</h3>
                    <div className="space-y-6">
                        {sources.map(s => (
                            <div key={s.name} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                                    <span className="text-slate-500">{s.name}</span>
                                    <span className="text-slate-800">₹{s.revenue.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${s.color} transition-all duration-1000`} style={{ width: `${(s.revenue / totalRevenue) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-8 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 mb-2">Commission Impact</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">Based on average OTA commission of 18%, your monthly leak to third-party platforms is approximately:</p>
                        <div className="mt-6 p-6 bg-red-50 rounded-2xl border border-red-100">
                            <p className="text-xs font-black text-red-400 uppercase tracking-widest">Estimated Commission Paid</p>
                            <p className="text-4xl font-black text-red-600 mt-2">₹1,53,000</p>
                        </div>
                    </div>
                    <div className="mt-8 flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
                            <ArrowUpRight size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-800">Strategy Suggestion</p>
                            <p className="text-[10px] text-emerald-600 font-medium">Focus on converting Booking.com guests to Direct Walk-ins for an 18% margin boost.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- Module: Front Desk Operations ---

const FrontDeskOps = ({ searchQuery, roomTypes, blockedRooms }) => {
    const [arrivals, setArrivals] = useState([
        { guest: "Arjun Malhotra", room: "302", type: "Heritage Suite", time: "14:00", status: "pending" },
        { guest: "Priya Sharma", room: "105", type: "Standard Queen", time: "15:30", status: "confirmed" },
        { guest: "Rohan Gupta", room: "501", type: "Maharaja Suite", time: "16:45", status: "pending" },
        { guest: "Ananya Iyer", room: "204", type: "Deluxe King", time: "11:20", status: "confirmed" },
    ]);
    const [showModal, setShowModal] = useState(false);

    // Updated: initial state defaults to the first room and its corresponding type
    const [newGuest, setNewGuest] = useState({
        guest: "",
        room: MASTER_ROOMS[0].id,
        type: MASTER_ROOMS[0].type,
        time: "12:00"
    });

    const [errorMsg, setErrorMsg] = useState("");

    // Updated: handle room change to auto-fetch type
    const handleRoomChange = (e) => {
        const roomId = e.target.value;
        const room = MASTER_ROOMS.find(r => r.id === roomId);
        setNewGuest({ ...newGuest, room: roomId, type: room?.type || "" });
        setErrorMsg("");
    };

    const handleQuickCheckIn = (e) => {
        e.preventDefault();
        setErrorMsg("");
        if (blockedRooms.includes(newGuest.room)) {
            setErrorMsg(`Room ${newGuest.room} is currently BLOCKED and cannot be booked.`);
            return;
        }
        setArrivals([...arrivals, { ...newGuest, status: "pending" }]);
        setShowModal(false);
        setNewGuest({
            guest: "",
            room: MASTER_ROOMS[0].id,
            type: MASTER_ROOMS[0].type,
            time: "12:00"
        });
    };

    const filteredArrivals = useMemo(() => {
        return arrivals
            .filter(a => a.guest.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.guest.localeCompare(b.guest));
    }, [arrivals, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setErrorMsg(""); }} title="Quick Check-in">
                <form onSubmit={handleQuickCheckIn} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Name</label>
                        <input required type="text" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 shadow-sm focus:border-blue-500 transition-all outline-none" value={newGuest.guest} onChange={e => setNewGuest({ ...newGuest, guest: e.target.value })} placeholder="e.g. Arjun" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room #</label>
                            {/* Updated: Changed from text input to select dropdown */}
                            <select
                                className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 shadow-sm focus:border-blue-500 transition-all outline-none appearance-none"
                                value={newGuest.room}
                                onChange={handleRoomChange}
                            >
                                {MASTER_ROOMS.map(room => (
                                    <option key={room.id} value={room.id} disabled={blockedRooms.includes(room.id)}>
                                        {room.id} {blockedRooms.includes(room.id) ? '(Blocked)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arrival Time</label>
                            <input required type="time" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 shadow-sm focus:border-blue-500 transition-all outline-none" value={newGuest.time} onChange={e => setNewGuest({ ...newGuest, time: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-fetched Room Type</label>
                        {/* Updated: Changed from select to read-only input */}
                        <input
                            readOnly
                            type="text"
                            className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-100 mt-1 outline-none text-slate-500 cursor-not-allowed"
                            value={newGuest.type}
                        />
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 border border-red-100 animate-in shake duration-300">
                            <AlertTriangle size={16} />
                            <span className="text-xs font-bold">{errorMsg}</span>
                        </div>
                    )}

                    <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all">Check-in Guest</button>
                </form>
            </Modal>

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Front Desk</h2>
                    <p className="text-slate-500 text-sm">Real-time check-in and guest movement.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                    <UserPlus size={18} /> Quick Check-in
                </button>
            </div>
            <Card className="overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guest</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Room Info</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ETA</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredArrivals.map((a, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">{a.guest.charAt(0)}</div>
                                        <span className="font-bold text-slate-800">{a.guest}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-700">Room {a.room}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{a.type}</p>
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-500">{a.time}</td>
                                <td className="px-6 py-4"><Badge status={a.status}>{a.status}</Badge></td>
                                <td className="px-6 py-4 text-right">
                                    <button className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-600 hover:text-white transition-all">Check-in</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

// --- Module: Room Bookings ---

const RoomBookings = ({ searchQuery, roomTypes, userRole, blockedRooms }) => {
    const [bookings, setBookings] = useState([
        { id: "BK-9021", guest: "Siddharth Verma", checkIn: "Oct 12", checkOut: "Oct 15", status: "confirmed", amount: "₹1,02,400" },
        { id: "BK-9022", guest: "Ishita Patel", checkIn: "Oct 13", checkOut: "Oct 14", status: "pending", amount: "₹28,350" },
        { id: "BK-9023", guest: "Vikram Singh", checkIn: "Oct 14", checkOut: "Oct 20", status: "confirmed", amount: "₹2,12,800" },
    ]);
    const [showModal, setShowModal] = useState(false);

    // Updated: initial state defaults to first room number and its auto-fetched properties
    const [newBooking, setNewBooking] = useState({
        guest: "",
        guestIds: [{ idNumber: "", idPhotoName: "" }],
        checkIn: "",
        checkOut: "",
        roomNumber: MASTER_ROOMS[0].id,
        roomType: MASTER_ROOMS[0].type,
        amount: roomTypes.find(rt => rt.name === MASTER_ROOMS[0].type)?.price || "",
        source: "Walk-in",
        otherSource: "",
        company: "",
        paymentMethod: "Cash"
    });

    const [errorMsg, setErrorMsg] = useState("");

    // Updated: handle room selection to auto-fetch type and update amount
    const handleRoomSelect = (e) => {
        const roomId = e.target.value;
        const room = MASTER_ROOMS.find(r => r.id === roomId);
        const selectedType = roomTypes.find(rt => rt.name === room.type);
        setNewBooking({
            ...newBooking,
            roomNumber: roomId,
            roomType: room.type,
            amount: selectedType ? selectedType.price : ""
        });
        setErrorMsg("");
    };

    const handleNewBooking = (e) => {
        e.preventDefault();

        // Prevent booking if room is blocked
        if (blockedRooms.includes(newBooking.roomNumber)) {
            setErrorMsg(`Room ${newBooking.roomNumber} is currently blocked and cannot be reserved.`);
            return;
        }

        const id = `BK-${Math.floor(Math.random() * 9000) + 1000}`;
        setBookings([...bookings, {
            ...newBooking,
            id,
            status: "pending",
            amount: `₹${Number(newBooking.amount).toLocaleString('en-IN')}`
        }]);
        closeBooking();
    };

    const handleDelete = (id) => {
        setBookings(bookings.filter(b => b.id !== id));
    };

    const closeBooking = () => {
        setShowModal(false);
        setErrorMsg("");
        setNewBooking({
            guest: "",
            guestIds: [{ idNumber: "", idPhotoName: "" }],
            checkIn: "",
            checkOut: "",
            roomNumber: MASTER_ROOMS[0].id,
            roomType: MASTER_ROOMS[0].type,
            amount: roomTypes.find(rt => rt.name === MASTER_ROOMS[0].type)?.price || "",
            source: "Walk-in",
            otherSource: "",
            company: "",
            paymentMethod: "Cash"
        });
    };

    const addIdField = () => {
        setNewBooking({
            ...newBooking,
            guestIds: [...newBooking.guestIds, { idNumber: "", idPhotoName: "" }]
        });
    };

    const removeIdField = (index) => {
        const updated = [...newBooking.guestIds];
        updated.splice(index, 1);
        setNewBooking({ ...newBooking, guestIds: updated });
    };

    const updateIdField = (index, field, value) => {
        const updated = [...newBooking.guestIds];
        updated[index][field] = value;
        setNewBooking({ ...newBooking, guestIds: updated });
    };

    const filteredBookings = useMemo(() => {
        return bookings
            .filter(b => b.guest.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.guest.localeCompare(b.guest));
    }, [bookings, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Modal isOpen={showModal} onClose={closeBooking} title="New Reservation">
                <form onSubmit={handleNewBooking} className="space-y-6 pb-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Guest Name</label>
                        <input required type="text" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 shadow-sm focus:border-blue-500 transition-all outline-none" value={newBooking.guest} onChange={e => setNewBooking({ ...newBooking, guest: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room Number</label>
                            {/* Updated: Changed from Room Type select to Room Number select */}
                            <select
                                className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 appearance-none outline-none shadow-sm focus:border-blue-500"
                                value={newBooking.roomNumber}
                                onChange={handleRoomSelect}
                            >
                                {MASTER_ROOMS.map(room => (
                                    <option key={room.id} value={room.id} disabled={blockedRooms.includes(room.id)}>
                                        {room.id} {blockedRooms.includes(room.id) ? '(Blocked)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room Type (Auto)</label>
                            <input
                                readOnly
                                type="text"
                                className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-100 mt-1 outline-none text-slate-500 cursor-not-allowed"
                                value={newBooking.roomType}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identification Documents</p>
                            <button
                                type="button"
                                onClick={addIdField}
                                className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 hover:underline"
                            >
                                <Plus size={14} /> Add Another ID
                            </button>
                        </div>

                        {newBooking.guestIds.map((idEntry, index) => (
                            <div key={index} className="p-4 border-2 border-slate-100 rounded-2xl bg-slate-50/50 space-y-3 relative group">
                                {newBooking.guestIds.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeIdField(index)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Number (Aadhar/Passport) #{index + 1}</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Enter ID Number"
                                            className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold bg-white mt-1 outline-none focus:border-blue-500"
                                            value={idEntry.idNumber}
                                            onChange={e => updateIdField(index, 'idNumber', e.target.value)}
                                        />
                                    </div>
                                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-3 bg-white hover:bg-slate-50 transition-all text-center cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={e => updateIdField(index, 'idPhotoName', e.target.files[0]?.name)}
                                        />
                                        <div className="flex items-center justify-center gap-2">
                                            <Camera size={16} className="text-slate-400" />
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">
                                                {idEntry.idPhotoName || "Upload Photo"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-In</label>
                            <input required type="date" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 focus:border-blue-500 transition-all outline-none" value={newBooking.checkIn} onChange={e => setNewBooking({ ...newBooking, checkIn: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-Out</label>
                            <input required type="date" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 focus:border-blue-500 transition-all outline-none" value={newBooking.checkOut} onChange={e => setNewBooking({ ...newBooking, checkOut: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</label>
                            <select className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 appearance-none outline-none" value={newBooking.source} onChange={e => setNewBooking({ ...newBooking, source: e.target.value })}>
                                <option value="Walk-in">Walk-in</option>
                                <option value="Booking Platform">Booking Platform</option>
                                <option value="Other">Other Source</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</label>
                            <select className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 appearance-none outline-none" value={newBooking.paymentMethod} onChange={e => setNewBooking({ ...newBooking, paymentMethod: e.target.value })}>
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI / GPay</option>
                                <option value="Prepaid">Prepaid (Full Payment)</option>
                                <option value="Card">Credit/Debit Card</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company (If Corp)</label>
                            <input type="text" placeholder="Tata, etc" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 focus:border-blue-500 transition-all outline-none" value={newBooking.company} onChange={e => setNewBooking({ ...newBooking, company: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount (₹)</label>
                            <input required type="number" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 focus:border-blue-500 transition-all outline-none" value={newBooking.amount} onChange={e => setNewBooking({ ...newBooking, amount: e.target.value })} />
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 border border-red-100 animate-in shake duration-300">
                            <AlertTriangle size={16} />
                            <span className="text-xs font-bold">{errorMsg}</span>
                        </div>
                    )}

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={closeBooking}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase hover:bg-slate-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all"
                        >
                            Create Booking
                        </button>
                    </div>
                </form>
            </Modal>

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Reservations</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                    <Plus size={18} /> New Booking
                </button>
            </div>
            <Card className="overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guest</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dates</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            {userRole === 'Owner' && <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredBookings.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{b.id}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{b.guest}</td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-600">{b.checkIn} — {b.checkOut}</td>
                                <td className="px-6 py-4 font-bold text-blue-600">{b.amount}</td>
                                <td className="px-6 py-4"><Badge status={b.status}>{b.status}</Badge></td>
                                {userRole === 'Owner' && (
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

// --- Module: Housekeeping & Maintenance ---

const HousekeepingModule = () => {
    const [rooms, setRooms] = useState([
        { id: "101", type: "Standard Queen", status: "available", hk: "inspected", issue: null },
        { id: "102", type: "Standard Queen", status: "occupied", hk: "clean", issue: null },
        { id: "201", type: "Deluxe King", status: "available", hk: "cleaning", issue: null },
        { id: "202", type: "Deluxe King", status: "available", hk: "dirty", issue: "Leaking Tap" },
        { id: "401", type: "Executive King", status: "available", hk: "dirty", issue: "AC not cooling" },
        { id: "501", type: "Maharaja Suite", status: "available", hk: "inspected", issue: null },
    ]);
    const [activeTab, setActiveTab] = useState('all');
    const [showMaintModal, setShowMaintModal] = useState(false);
    const [maintData, setMaintData] = useState({ roomId: "101", issue: "" });

    const updateHkStatus = (id, newStatus) => {
        setRooms(rooms.map(r => r.id === id ? { ...r, hk: newStatus } : r));
    };

    const handleRaiseMaintenance = (e) => {
        e.preventDefault();
        setRooms(rooms.map(r => r.id === maintData.roomId ? { ...r, issue: maintData.issue, hk: 'dirty' } : r));
        setShowMaintModal(false);
        setMaintData({ roomId: "101", issue: "" });
    };

    const filteredRooms = rooms.filter(r => {
        if (activeTab === 'all') return true;
        if (activeTab === 'dirty') return r.hk === 'dirty' || r.hk === 'cleaning';
        if (activeTab === 'maintenance') return r.issue !== null;
        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Modal isOpen={showMaintModal} onClose={() => setShowMaintModal(false)} title="Raise Maintenance">
                <form onSubmit={handleRaiseMaintenance} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Room</label>
                        <select className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-all appearance-none" value={maintData.roomId} onChange={e => setMaintData({ ...maintData, roomId: e.target.value })}>
                            {rooms.map(r => <option key={r.id} value={r.id}>Room {r.id}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issue Description</label>
                        <textarea required className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-all" value={maintData.issue} onChange={e => setMaintData({ ...maintData, issue: e.target.value })} placeholder="e.g. AC leaking, Door lock stuck..." />
                    </div>
                    <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all">Submit Ticket</button>
                </form>
            </Modal>

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Hotel Rooms</h2>
                    <p className="text-slate-500 text-sm">Live housekeeping and maintenance status.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowMaintModal(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
                        <Wrench size={18} /> Raise Maintenance
                    </button>
                </div>
            </div>

            <div className="flex gap-6 border-b border-slate-200">
                {['all', 'dirty', 'maintenance'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`pb-4 px-2 text-xs font-bold uppercase tracking-widest relative transition-all ${activeTab === t ? 'text-blue-600' : 'text-slate-400'}`}>
                        {t} Rooms
                        {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full shadow-lg"></div>}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredRooms.map(r => (
                    <Card key={r.id} className={`p-6 hover:shadow-xl transition-all border-b-4 ${r.issue ? 'border-b-slate-900' : 'border-b-transparent'}`}>
                        <div className="flex justify-between mb-4">
                            <span className="text-2xl font-black text-slate-800 tracking-tighter">{r.id}</span>
                            <Badge status={r.hk}>{r.hk}</Badge>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{r.type}</p>
                        <div className={`flex items-center gap-2 mb-4`}>
                            <div className={`w-2 h-2 rounded-full ${r.status === 'available' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                            <span className="text-xs font-bold text-slate-600 capitalize">{r.status}</span>
                        </div>
                        {r.issue && (
                            <div className="bg-red-50 p-2 rounded-lg border border-red-100 flex items-start gap-2 mb-4">
                                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] font-bold text-red-700 leading-tight">FIX: {r.issue}</p>
                            </div>
                        )}
                        <div className="pt-4 border-t border-slate-50">
                            <button
                                onClick={() => updateHkStatus(r.id, r.hk === 'dirty' ? 'cleaning' : r.hk === 'cleaning' ? 'inspected' : 'dirty')}
                                className="w-full bg-slate-100 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all"
                            >
                                Update Status
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

// --- Module: Inventory & Store ---

const InventoryModule = () => {
    const [stockItems, setStockItems] = useState([
        { id: "INV-001", name: "Premium Bed Linen (King)", category: "Linen", qty: 45, unit: "pcs", status: "low" },
        { id: "INV-002", name: "Hand Sanitizer 500ml", category: "Toiletries", qty: 120, unit: "btl", status: "sufficient" },
        { id: "INV-003", name: "Darjeeling Tea Bags", category: "F&B", qty: 250, unit: "pkts", status: "sufficient" },
    ]);
    const [showModal, setShowModal] = useState(false);
    const [newItem, setNewItem] = useState({ name: "", qty: "", unit: "pcs" });

    const handleNewEntry = (e) => {
        e.preventDefault();
        const id = `INV-00${stockItems.length + 1}`;
        setStockItems([...stockItems, { ...newItem, id, status: newItem.qty < 50 ? "low" : "sufficient" }]);
        setShowModal(false);
        setNewItem({ name: "", qty: "", unit: "pcs" });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Stock Entry">
                <form onSubmit={handleNewEntry} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</label>
                        <input required type="text" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-all" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</label>
                            <input required type="number" className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-all" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</label>
                            <select className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50 mt-1 outline-none focus:border-blue-500 transition-all appearance-none" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                                <option>pcs</option><option>btl</option><option>pkts</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all">Add to Store</button>
                </form>
            </Modal>

            <div className="flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory & Store</h2></div>
                <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100"><Plus size={18} /> New Entry</button>
            </div>
            <Card className="overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr><th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU</th><th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item</th><th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock</th><th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stockItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{item.id}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                                <td className="px-6 py-4 font-black text-slate-800">{item.qty} {item.unit}</td>
                                <td className="px-6 py-4"><Badge status={item.status}>{item.status}</Badge></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

// --- Module: Night Audit Workflow ---

const NightAuditModule = ({ businessDate, setBusinessDate, lockedDates, setLockedDates, userRole, pushAudit }) => {
    const [auditStep, setAuditStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [rolledTo, setRolledTo] = useState(null);

    const runAudit = () => {
        if (!roleCan(userRole, PERMISSIONS.DAY_CLOSE)) {
            alert("Only Owner or Manager can run Night Audit / Close Day.");
            return;
        }
        setAuditStep(1);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    const closing = businessDate;
                    const next = addDaysISO(businessDate, 1);
                    const nextLocked = Array.from(new Set([...(lockedDates || []), closing])).sort();
                    setLockedDates(nextLocked);
                    setRolledTo(next);
                    setBusinessDate(next);
                    pushAudit(createAuditEntry({
                        role: userRole,
                        action: "DAY_CLOSED",
                        meta: { closingDate: closing, newBusinessDate: next }
                    }));
                    setTimeout(() => setAuditStep(2), 500);
                    return 100;
                }
                return prev + 20;
            });
        }, 1000);
    };

    const checklist = [
        { task: "Verify Room Status (All Dirty/Clean set)", done: true },
        { task: "Check Pending Departures (8/8 Cleared)", done: true },
        { task: "Check Unposted Charges (Mini-bar/Laundry)", done: true },
        { task: "Reconcile Cash & Card Drawer", done: false },
    ];

    if (auditStep === 2) {
        return (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                <div className="text-center py-12 bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-200">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-emerald-100">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800">Night Audit Successful</h2>
                    <p className="text-slate-500 mt-2">Business Date rolled to {formatHumanDate(rolledTo || businessDate)}. Flash Reports Generated.</p>
                    <div className="flex gap-3 justify-center mt-8">
                        <button className="bg-white border border-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50">
                            <FileText size={18} /> Daily Flash Report
                        </button>
                        <button onClick={() => { setAuditStep(0); setProgress(0); }} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100">
                            Return to Desk
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Night Audit Workflow</h2>
                    <p className="text-slate-500 text-sm">Close business day and roll the property date.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Property Date</p>
                    <p className="text-lg font-black text-blue-600">{formatHumanDate(businessDate)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-8">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Zap size={18} className="text-amber-500" /> Audit Readiness Checklist
                        </h3>
                        <div className="space-y-4">
                            {checklist.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        {item.done ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Clock className="text-amber-500" size={20} />}
                                        <span className={`text-sm font-bold ${item.done ? 'text-slate-800' : 'text-slate-500'}`}>{item.task}</span>
                                    </div>
                                    {item.done ? <Badge status="success">Ready</Badge> : <button className="text-[10px] font-black uppercase text-blue-600 hover:underline transition-all">Fix Now</button>}
                                </div>
                            ))}
                        </div>

                        {auditStep === 1 ? (
                            <div className="mt-8 space-y-4">
                                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    <span>Posting Room Charges...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={runAudit}
                                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
                            >
                                <RotateCw size={24} /> Run Night Audit
                            </button>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6 bg-blue-600 text-white border-0 shadow-lg shadow-blue-100">
                        <h4 className="font-bold text-xs uppercase tracking-widest opacity-80">Projected Postings</h4>
                        <p className="text-4xl font-black mt-2">₹1,84,200</p>
                        <p className="text-xs mt-2 opacity-80">Room Revenue to be posted at midnight.</p>
                        <div className="mt-6 pt-6 border-t border-white/20">
                            <div className="flex justify-between text-sm font-bold">
                                <span>Total Occupancy</span>
                                <span>84%</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h4 className="font-bold text-slate-800 text-sm mb-4">What happens during audit?</h4>
                        <ul className="space-y-3">
                            {[
                                "Posts room rates & taxes to folios",
                                "Updates room status from occupied to stayover",
                                "Advances the business date by +1",
                                "Locks previous day's financial ledger"
                            ].map((text, i) => (
                                <li key={i} className="flex gap-2 text-xs text-slate-500 leading-relaxed">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1"></div>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// --- Module: Billing & Invoicing ---

const BillingModule = ({ businessDate, lockedDates, userRole, pushAudit }) => {
    const [activeFolio, setActiveFolio] = useState('Personal');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);

    const [folioItems, setFolioItems] = useState(() => {
        const short = (iso) => {
            try {
                const d = new Date(`${iso}T00:00:00`);
                return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
            } catch {
                return iso;
            }
        };
        return [
            { id: 1, date: short(businessDate), desc: "Room Charge - Deluxe King", amount: 20000, type: "charge", target: "Personal" },
            { id: 2, date: short(businessDate), desc: "Breakfast", amount: 1500, type: "charge", target: "Personal" },
            { id: 3, date: short(businessDate), desc: "Room Service", amount: 4500, type: "charge", target: "Personal" },
        ];
    });

    const guestPhone = "919876543210";
    const guestName = "Arjun Malhotra";

    const handleCommunication = (type) => {
        const baseUrl = `https://wa.me/${guestPhone}?text=`;
        const invoiceMsg = encodeURIComponent(`Hello ${guestName}, please find your digital stay invoice from SERVANA Boutique Hotel attached. Thank you for choosing us!`);
        const reviewMsg = encodeURIComponent(`Hello ${guestName}, we hope you enjoyed your stay! We would really appreciate it if you could share your experience on our Google Review page: https://g.page/servana-jaipur/review`);
        const bothMsg = encodeURIComponent(`Hello ${guestName},\n\n1. Please find your stay invoice attached.\n2. We hope you had a great stay! Kindly share your review here: https://g.page/servana-jaipur/review\n\nThank you!`);

        let targetUrl = "";
        if (type === 'invoice') targetUrl = baseUrl + invoiceMsg;
        else if (type === 'review') targetUrl = baseUrl + reviewMsg;
        else if (type === 'both') targetUrl = baseUrl + bothMsg;

        window.open(targetUrl, '_blank');
        setShowCheckoutModal(false);
    };

    const toggleTarget = (id) => {
        setFolioItems(folioItems.map(item => item.id === id ? { ...item, target: item.target === 'Personal' ? 'Company' : 'Personal' } : item));
    };

    const displayedItems = useMemo(() => folioItems.filter(item => item.target === activeFolio), [folioItems, activeFolio]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="GST Tax Invoice">
                <div className="space-y-8 font-serif p-4">
                    <div className="flex justify-between border-b-2 border-slate-900 pb-8">
                        <div><h4 className="font-black text-xl italic text-slate-800">SERVANA Heritage</h4><p className="text-sm font-bold mt-1">GSTIN: 08AAACS1234A1Z5</p></div>
                        <div className="text-right"><p className="text-sm font-bold">Billed To:</p><p className="text-lg font-black">{activeFolio === 'Company' ? 'TechCorp Solutions India Pvt Ltd' : 'Mr. Arjun Malhotra'}</p></div>
                    </div>
                    <table className="w-full text-left">
                        <thead><tr className="border-b text-xs font-bold uppercase tracking-widest"><th className="py-4">Description</th><th className="py-4 text-right">Amount (₹)</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{displayedItems.map(item => (<tr key={item.id}><td className="py-4 text-sm font-medium">{item.desc}</td><td className="py-4 text-sm text-right font-bold">{item.amount.toLocaleString('en-IN')}</td></tr>))}</tbody>
                    </table>
                    <div className="w-full space-y-2 pt-6 border-t-2 border-slate-900">
                        <div className="flex justify-between text-xl font-black pt-2 text-blue-600"><span>Total:</span><span>₹{(displayedItems.reduce((a, b) => a + b.amount, 0)).toLocaleString('en-IN')}</span></div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showCheckoutModal} onClose={() => setShowCheckoutModal(false)} title="Checkout Actions">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 font-medium mb-6">Payment processed successfully. Choose follow-up communication:</p>

                    <button
                        onClick={() => handleCommunication('invoice')}
                        className="w-full p-4 border-2 border-slate-100 rounded-2xl flex items-center gap-4 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <FileText size={24} />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Send Invoice</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Opens WhatsApp with digital receipt</p>
                        </div>
                        <ChevronRight className="ml-auto text-slate-300" size={20} />
                    </button>

                    <button
                        onClick={() => handleCommunication('review')}
                        className="w-full p-4 border-2 border-slate-100 rounded-2xl flex items-center gap-4 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Star size={24} />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Send Review Request</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Invite guest to leave Google Review</p>
                        </div>
                        <ChevronRight className="ml-auto text-slate-300" size={20} />
                    </button>

                    <button
                        onClick={() => handleCommunication('both')}
                        className="w-full p-4 border-2 border-slate-100 rounded-2xl flex items-center gap-4 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                    >
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <MessageSquare size={24} />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-slate-800 uppercase text-xs tracking-widest">Send Both</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Send invoice + review link in one chat</p>
                        </div>
                        <ChevronRight className="ml-auto text-slate-300" size={20} />
                    </button>

                    <div className="pt-4 border-t border-slate-50 mt-4">
                        <button
                            onClick={() => setShowCheckoutModal(false)}
                            className="w-full py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600"
                        >
                            Skip & Close
                        </button>
                    </div>
                </div>
            </Modal>

            <div className="flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-slate-800 tracking-tight">Billing & Folio</h2><p className="text-slate-500 text-sm font-medium italic">Guest: Arjun Malhotra • Room 302</p></div>
                <button onClick={() => setShowInvoiceModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"><Receipt size={18} /> Generate GST Invoice</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-0 overflow-hidden">
                        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Transaction Log</h3>
                            <div className="flex bg-white border rounded-xl p-1 gap-1 shadow-sm">
                                <button onClick={() => setActiveFolio('Personal')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeFolio === 'Personal' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>Personal</button>
                                <button onClick={() => setActiveFolio('Company')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeFolio === 'Company' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>Company</button>
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50"><tr><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th><th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th><th className="px-8 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayedItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-8 py-5"><p className="text-sm font-bold text-slate-800">{item.desc}</p><p className="text-[10px] font-bold text-blue-500 uppercase">{item.type}</p></td>
                                        <td className="px-8 py-5 font-black text-slate-800">₹{item.amount.toLocaleString('en-IN')}</td>
                                        <td className="px-8 py-5 text-center"><button onClick={() => toggleTarget(item.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 mx-auto transition-all bg-slate-100 text-slate-400 hover:text-blue-600 transition-all"><Split size={12} /> Move Folio</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card className="p-8 space-y-8 bg-slate-900 text-white border-0 shadow-2xl">
                        <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Outstanding</p><p className="text-5xl font-black mt-2 tracking-tighter">₹{(displayedItems.reduce((a, b) => a + b.amount, 0)).toLocaleString('en-IN')}</p></div>
                        <button
                            onClick={() => setShowCheckoutModal(true)}
                            className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-400 hover:text-white transition-all shadow-lg"
                        >
                            Process Checkout
                        </button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// --- Module: System Settings ---

const SettingsModule = ({ userRole, roomTypes, onSetRoomTypes }) => {
    const [propertyInfo, setPropertyInfo] = useState({
        name: "Servana Boutique Hotel, Jaipur",
        gstin: "08AAACS1234A1Z5",
        phone: "+91 141 2233445",
        email: "management@servana-jaipur.com",
        address: "M.I. Road, Pink City, Jaipur, Rajasthan 302001"
    });

    const [opsSettings, setOpsSettings] = useState({
        checkIn: "14:00",
        checkOut: "11:00",
        cgst: "6",
        sgst: "6"
    });

    const [newRoomType, setNewRoomType] = useState({ name: "", price: "" });

    const handleAddRoomType = (e) => {
        e.preventDefault();
        if (!newRoomType.name || !newRoomType.price) return;
        onSetRoomTypes([...roomTypes, { ...newRoomType, price: Number(newRoomType.price) }]);
        setNewRoomType({ name: "", price: "" });
    };

    const removeRoomType = (name) => {
        onSetRoomTypes(roomTypes.filter(rt => rt.name !== name));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Settings</h2>
                <p className="text-slate-500 text-sm font-medium">Configure PMS behavior and user permissions.</p>
            </div>

            <Card className="p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Bed className="text-blue-600" size={20} />
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Room Configuration</h3>
                </div>
                <div className="space-y-6">
                    <form onSubmit={handleAddRoomType} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room Type Name</label>
                            <input type="text" placeholder="e.g. Executive Suite" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all" value={newRoomType.name} onChange={e => setNewRoomType({ ...newRoomType, name: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price (₹)</label>
                            <input type="number" placeholder="5000" className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all" value={newRoomType.price} onChange={e => setNewRoomType({ ...newRoomType, price: e.target.value })} />
                        </div>
                        <button type="submit" className="bg-blue-600 text-white h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                            <Plus size={18} /> Add Room Type
                        </button>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roomTypes.map((rt, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all group">
                                <div>
                                    <p className="font-bold text-slate-800">{rt.name}</p>
                                    <p className="text-xs font-black text-blue-600 mt-0.5">₹{rt.price.toLocaleString('en-IN')}</p>
                                </div>
                                <button onClick={() => removeRoomType(rt.name)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <Building2 className="text-slate-400" size={20} />
                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Property Profile</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hotel Name</label>
                            <input type="text" className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={propertyInfo.name} onChange={e => setPropertyInfo({ ...propertyInfo, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN Number</label>
                            <input type="text" className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={propertyInfo.gstin} onChange={e => setPropertyInfo({ ...propertyInfo, gstin: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Phone</label>
                            <input type="tel" className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 transition-all" value={propertyInfo.phone} onChange={e => setPropertyInfo({ ...propertyInfo, phone: e.target.value })} />
                        </div>
                    </div>
                </Card>

                <Card className="p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <Timer className="text-slate-400" size={20} />
                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Operational Defaults</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-in Time</label>
                                <input type="time" className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 outline-none" value={opsSettings.checkIn} onChange={e => setOpsSettings({ ...opsSettings, checkIn: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-out Time</label>
                                <input type="time" className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 outline-none" value={opsSettings.checkOut} onChange={e => setOpsSettings({ ...opsSettings, checkOut: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CGST Rate (%)</label>
                                <input type="number" className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 outline-none" value={opsSettings.cgst} onChange={e => setOpsSettings({ ...opsSettings, cgst: e.target.value })} />
                                <Percent size={12} className="absolute right-4 top-9 text-slate-400" />
                            </div>
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SGST Rate (%)</label>
                                <input type="number" className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-50 outline-none" value={opsSettings.sgst} onChange={e => setOpsSettings({ ...opsSettings, sgst: e.target.value })} />
                                <Percent size={12} className="absolute right-4 top-9 text-slate-400" />
                            </div>
                        </div>
                    </div>
                    <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg mt-4">
                        Update Configuration
                    </button>
                </Card>
            </div>
        </div>
    );
};

// --- Main Shell ---

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeTab, setActiveTab] = useState('in-house');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [userRole, setUserRole] = useState('Owner');
    const [globalSearch, setGlobalSearch] = useState('');
    const [businessDate, setBusinessDate] = useState("2023-10-15");
    const [lockedDates, setLockedDates] = useState([]);
    const [auditLog, setAuditLog] = useState([]);

    const [roomTypes, setRoomTypes] = useState([
        { name: "Standard Queen", price: 4500 },
        { name: "Deluxe King", price: 7500 },
        { name: "Heritage Suite", price: 12000 },
        { name: "Maharaja Suite", price: 25000 }
    ]);

    const [blockedRooms, setBlockedRooms] = useState([]);

    const pushAudit = (entry) => {
        setAuditLog(prev => [entry, ...prev]);
    };

    const handleLogin = (role) => {
        setUserRole(role);
        pushAudit(createAuditEntry({ role, action: "LOGIN", meta: {} }));
        setIsLoggedIn(true);
        setActiveTab('in-house');
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setGlobalSearch('');
    };

    const handleToggleBlock = (roomId) => {
        setBlockedRooms(prev =>
            prev.includes(roomId)
                ? prev.filter(id => id !== roomId)
                : [...prev, roomId]
        );
    };

    const navItems = [
        { id: 'front-desk', label: 'Front Desk', icon: ConciergeBell },
        { id: 'in-house', label: 'In-House', icon: UserCheck },
        { id: 'bookings', label: 'Reservations', icon: Calendar },
        { id: 'guests', label: 'Guest CRM', icon: Users },
        { id: 'corporations', label: 'Corporations', icon: Building2 },
        { id: 'block-rooms', label: 'Block Rooms', icon: Ban },
        { id: 'ledger', label: 'Billing & Folio', icon: Wallet },
        { id: 'rooms', label: 'Hotel Rooms', icon: Bed },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'analytics', label: 'Source Analytics', icon: BarChart3 },
        { id: 'monthly-reports', label: 'Monthly Reports', icon: FileText },
        { id: 'audit', label: 'Night Audit', icon: RotateCw },
        { id: 'settings', label: 'Settings', icon: Settings },
    ].filter(item => {
        if (userRole === 'Front Desk' && (item.id === 'settings' || item.id === 'block-rooms')) return false;
        return true;
    });

    const renderContent = () => {
        switch (activeTab) {
            case 'front-desk': return <FrontDeskOps searchQuery={globalSearch} roomTypes={roomTypes} blockedRooms={blockedRooms} />;
            case 'in-house': return <InHouseModule onShowFolio={setActiveTab} searchQuery={globalSearch} userRole={userRole} />;
            // Updated: Passing blockedRooms to RoomBookings
            case 'bookings': return <RoomBookings searchQuery={globalSearch} roomTypes={roomTypes} userRole={userRole} blockedRooms={blockedRooms} />;
            case 'guests': return <GuestDatabase searchQuery={globalSearch} userRole={userRole} />;
            case 'corporations': return <CorporationsModule searchQuery={globalSearch} userRole={userRole} />;
            case 'block-rooms': return <BlockRoomsModule blockedRooms={blockedRooms} onToggleBlock={handleToggleBlock} />;
            case 'inventory': return <InventoryModule />;
            case 'analytics': return <SourceAnalytics />;
            case 'monthly-reports': return <MonthlyReportsModule />;
            case 'rooms': return <HousekeepingModule />;
            case 'ledger': return <BillingModule businessDate={businessDate} lockedDates={lockedDates} userRole={userRole} pushAudit={pushAudit} />;
            case 'audit': return <NightAuditModule businessDate={businessDate} setBusinessDate={setBusinessDate} lockedDates={lockedDates} setLockedDates={setLockedDates} userRole={userRole} pushAudit={pushAudit} />;
            case 'settings': return <SettingsModule userRole={userRole} roomTypes={roomTypes} onSetRoomTypes={setRoomTypes} />;
            default: return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Module Under Optimization</div>;
        }
    };

    if (!isLoggedIn) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className={`flex h-screen font-sans ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
            <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-20 overflow-hidden">
                <div className="p-8 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg ring-4 ring-blue-50">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h1 className="font-black text-2xl leading-none tracking-tight text-slate-800 uppercase">Servana</h1>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Boutique PMS</p>
                    </div>
                </div>
                <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto custom-scrollbar">
                    <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Main Menu</p>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === item.id ? "bg-blue-600 text-white shadow-xl shadow-blue-200 translate-x-2" : "text-slate-500 hover:bg-slate-50 hover:text-blue-600"
                                }`}
                        >
                            <div className="flex items-center gap-3 font-bold">
                                <item.icon size={20} className={activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-blue-600"} />
                                <span className="text-sm">{item.label}</span>
                            </div>
                            {activeTab === item.id && <ChevronRight size={16} />}
                        </button>
                    ))}
                </nav>
                <div className="p-6 border-t border-slate-50">
                    <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 border border-slate-100">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            {userRole.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate">{userRole}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Pro v3.5</p>
                        </div>
                        <button onClick={handleLogout} className="ml-auto text-slate-400 hover:text-red-600 p-1 transition-all" title="Logout"><LogOut size={18} /></button>
                    </div>
                </div>
            </aside>
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200 px-10 flex items-center justify-between z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Sync</span>
                        <div className="ml-4 h-6 w-px bg-slate-200"></div>
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-slate-400 hover:text-blue-600 p-1 transition-all"><Moon size={18} /></button>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-11 pr-4 py-2.5 bg-slate-100 border-2 border-transparent rounded-full text-sm font-medium outline-none w-80 focus:bg-white focus:border-blue-500 transition-all"
                                value={globalSearch}
                                onChange={e => setGlobalSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
                    <div className="max-w-6xl mx-auto pb-20">{renderContent()}</div>
                </div>
            </main>
        </div>
    );
}