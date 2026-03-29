import React, { useState, useEffect } from 'react';
import { Star, User, QrCode, ChevronLeft, CheckCircle, Calendar, BookOpen, LogOut, Edit3, ClipboardList, Wifi, WifiOff, ArrowLeft, ArrowRight } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, collection } from 'firebase/firestore';

// --- CẤU HÌNH FIREBASE CỦA BẠN ---
const firebaseConfig = {
  apiKey: "AIzaSyCxwqpY3cmHmfMsqlbcHgjAXltd5orSLVY",
  authDomain: "so-tay-1a.firebaseapp.com",
  projectId: "so-tay-1a",
  storageBucket: "so-tay-1a.firebasestorage.app",
  messagingSenderId: "535011497784",
  appId: "1:535011497784:web:2334eacffaa2b37b01d3cd"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = 'so-tay-1a-production'; 

// --- DỮ LIỆU MẪU ---
const CLASS_INFO = {
  school: "TRƯỜNG TIỂU HỌC QUẾ PHÚ",
  class: "1A",
  teacher: "Nguyễn Thị Ngọc Nguyên",
  title: "SỔ TAY NGÔI SAO HÀNH VI"
};

const CRITERIA = [
  { id: 1, title: "Lễ phép - Giao tiếp", details: ["Chào hỏi người lớn, thầy cô.", "Biết nói lời Cảm ơn - Xin lỗi.", "Không nói leo, nói tục."] },
  { id: 2, title: "Vệ sinh cá nhân", details: ["Rửa tay trước ăn & sau vệ sinh.", "Quần áo gọn gàng, sạch sẽ.", "Che miệng khi ho/hắt hơi."] },
  { id: 3, title: "Giữ gìn vệ sinh lớp", details: ["Bỏ rác đúng nơi quy định.", "Giữ bàn ghế sạch sẽ.", "Hỗ trợ bạn trực nhật."] },
  { id: 4, title: "Tinh thần hợp tác", details: ["Biết lắng nghe bạn nói.", "Hòa đồng, không gây gổ.", "Giúp đỡ bạn khi khó khăn."] },
  { id: 5, title: "Khả năng tự phục vụ", details: ["Tự cất/lấy đồ dùng đúng nơi.", "Chuẩn bị sách vở đầy đủ.", "Góc học tập ngăn nắp."] }
];

const INITIAL_STUDENTS = [
  { id: 1, name: "Cao Lê Bình An", dob: "26/09/2019", gender: "Nữ" },
  { id: 2, name: "Nguyễn Khánh An", dob: "23/07/2019", gender: "Nữ" },
  { id: 3, name: "Huỳnh Minh Anh", dob: "23/03/2019", gender: "Nữ" },
  { id: 4, name: "Lễ Nguyễn Quốc Bảo", dob: "05/05/2019", gender: "Nam" },
  { id: 5, name: "Lê Trần Minh Chiến", dob: "01/09/2019", gender: "Nam" },
  { id: 6, name: "Phạm Quỳnh Phương Dung", dob: "17/11/2019", gender: "Nữ" },
  { id: 7, name: "Lê Khắc Huy Hoàng", dob: "04/12/2019", gender: "Nam" },
  { id: 8, name: "Trần Văn Ngọc Hoàng", dob: "06/03/2019", gender: "Nam" },
  { id: 9, name: "Lê Gia Huy", dob: "28/12/2019", gender: "Nam" },
  { id: 10, name: "Nguyễn Gia Huy", dob: "01/07/2019", gender: "Nam" },
  { id: 11, name: "Nguyễn Nhật Huy", dob: "03/03/2019", gender: "Nam" },
  { id: 12, name: "Võ Thị Ngọc Huyền", dob: "10/09/2019", gender: "Nữ" },
  { id: 13, name: "Nguyễn Lê Tiến Hưng", dob: "13/03/2019", gender: "Nam" },
  { id: 14, name: "Trần Văn Gia Hưng", dob: "14/08/2019", gender: "Nam" },
  { id: 15, name: "Trương Gia Hưng", dob: "21/10/2019", gender: "Nam" },
  { id: 16, name: "Trương Ngọc Quỳnh Hương", dob: "17/06/2019", gender: "Nữ" }
];

// Hàm lấy ngày thứ 2 đầu tuần từ một ngày bất kỳ
const getMonday = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [ratings, setRatings] = useState({}); 
  const [weeklyReviews, setWeeklyReviews] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSyncing, setIsSyncing] = useState(true);

  // 1. KHỞI TẠO AUTH
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Lỗi đăng nhập:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    if (!user) return;

    const ratingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'class_1a_ratings');
    const unsubRatings = onSnapshot(ratingsRef, (snapshot) => {
      const data = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = doc.data();
      });
      setRatings(data);
      setIsSyncing(false);
    }, (error) => console.error("Lỗi tải ratings:", error));

    const reviewsRef = collection(db, 'artifacts', appId, 'public', 'data', 'class_1a_reviews');
    const unsubReviews = onSnapshot(reviewsRef, (snapshot) => {
      const data = {};
      snapshot.docs.forEach(doc => {
        data[doc.id] = doc.data();
      });
      setWeeklyReviews(data);
    }, (error) => console.error("Lỗi tải reviews:", error));

    return () => {
      unsubRatings();
      unsubReviews();
    };
  }, [user]);

  // 3. XỬ LÝ QR CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const studentIdParam = params.get('studentId');
    if (studentIdParam) {
      const studentId = parseInt(studentIdParam);
      const student = INITIAL_STUDENTS.find(s => s.id === studentId);
      if (student) {
        setSelectedStudent(student);
        setView('parent_view');
      }
    }
  }, []);

  // --- HÀM ---
  const saveRating = async (studentId, dateStr, newStars, newNote) => {
    if (!user) return;
    const key = `${studentId}-${dateStr}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'class_1a_ratings', key);
    await setDoc(docRef, { stars: newStars, note: newNote });
  };

  const saveWeeklyReview = async (studentId, dateStr, data) => {
    if (!user) return;
    const monday = getMonday(dateStr);
    const key = `${studentId}-${monday}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'class_1a_reviews', key);
    await setDoc(docRef, data);
  };

  const getRating = (studentId, dateStr) => {
    return ratings[`${studentId}-${dateStr}`] || { stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, note: "" };
  };

  const getWeeklyReview = (studentId, dateStr) => {
    const monday = getMonday(dateStr);
    return weeklyReviews[`${studentId}-${monday}`] || { highlights: "", improvements: "", comment: "" };
  };

  const goHome = () => {
    setView('home');
    setSelectedStudent(null);
  };

  if (!user) return <div className="flex items-center justify-center h-screen text-blue-600 font-bold animate-pulse">Đang kết nối máy chủ...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <Star className="fill-yellow-400 text-yellow-400" size={28} />
            <div>
              <h1 className="font-bold text-lg leading-tight">{CLASS_INFO.title}</h1>
              <p className="text-xs opacity-90">{CLASS_INFO.school} - Lớp {CLASS_INFO.class}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSyncing ? <WifiOff size={16} className="opacity-50" /> : <Wifi size={16} className="text-green-300" />}
            {view !== 'home' && (
              <button onClick={goHome} className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded flex items-center gap-1">
                <LogOut size={14} /> Thoát
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-20">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Bạn là ai?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-md">
              <button onClick={() => setView('teacher')} className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg border-2 border-transparent hover:border-blue-500 transition-all group">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200">
                  <User size={40} className="text-blue-600" />
                </div>
                <span className="text-xl font-bold text-slate-700">Giáo Viên</span>
                <span className="text-sm text-slate-500 mt-2">Chấm điểm & Đánh giá</span>
              </button>

              <button onClick={() => setView('parent_login')} className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg border-2 border-transparent hover:border-green-500 transition-all group">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200">
                  <QrCode size={40} className="text-green-600" />
                </div>
                <span className="text-xl font-bold text-slate-700">Phụ Huynh</span>
                <span className="text-sm text-slate-500 mt-2">Quét mã QR xem kết quả</span>
              </button>
            </div>
          </div>
        )}

        {view === 'teacher' && (
          <TeacherDashboard 
            students={INITIAL_STUDENTS} 
            onSelectStudent={(s) => { setSelectedStudent(s); setView('teacher_grading'); }}
            date={currentDate}
            setDate={setCurrentDate}
            ratings={ratings}
            weeklyReviews={weeklyReviews}
          />
        )}

        {view === 'teacher_grading' && selectedStudent && (
          <TeacherGrading 
            student={selectedStudent}
            date={currentDate}
            initialData={getRating(selectedStudent.id, currentDate)}
            initialWeeklyData={getWeeklyReview(selectedStudent.id, currentDate)}
            onSaveDaily={saveRating}
            onSaveWeekly={saveWeeklyReview}
            onBack={() => setView('teacher')}
          />
        )}

        {view === 'parent_login' && (
          <ParentLogin 
            students={INITIAL_STUDENTS}
            onLogin={(s) => { setSelectedStudent(s); setView('parent_view'); }}
            onBack={goHome}
          />
        )}

        {view === 'parent_view' && selectedStudent && (
          <ParentDashboard 
            student={selectedStudent}
            getRating={getRating}
            getWeeklyReview={getWeeklyReview}
            onBack={goHome}
          />
        )}
      </main>
    </div>
  );
}

// --- CÁC COMPONENT CON ---

function TeacherDashboard({ students, onSelectStudent, date, setDate, ratings, weeklyReviews }) {
  const monday = getMonday(date);
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-blue-900">Danh Sách Lớp 1A</h2>
          <p className="text-slate-500 text-sm">GVCN: {CLASS_INFO.teacher}</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
          <Calendar size={18} className="text-blue-600" />
          <span className="text-sm font-medium text-slate-600">Ngày làm việc:</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-none font-bold text-blue-700 focus:ring-0 cursor-pointer" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map(student => {
           const key = `${student.id}-${date}`;
           const hasGraded = ratings[key] && Object.values(ratings[key].stars).some(v => v > 0);
           const weekKey = `${student.id}-${monday}`;
           const hasWeeklyReview = weeklyReviews[weekKey] && (weeklyReviews[weekKey].highlights || weeklyReviews[weekKey].improvements);

           return (
            <div key={student.id} onClick={() => onSelectStudent(student)} className={`p-4 rounded-lg border shadow-sm cursor-pointer transition-all hover:shadow-md relative ${hasGraded ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">STT: {student.id}</span>
                <div className="flex gap-1">
                   {hasWeeklyReview && <ClipboardList size={18} className="text-blue-500" title="Đã nhận xét tuần" />}
                   {hasGraded && <CheckCircle size={18} className="text-green-500" title="Đã chấm điểm hôm nay" />}
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-800">{student.name}</h3>
              <div className="text-sm text-slate-500 mt-1 flex gap-4">
                <span>{student.gender}</span>
                <span>{student.dob}</span>
              </div>
              <div className="mt-3 text-xs text-blue-600 font-medium flex items-center gap-1">Chấm điểm / Nhận xét <ChevronLeft size={12} className="rotate-180" /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeacherGrading({ student, date, initialData, initialWeeklyData, onSaveDaily, onSaveWeekly, onBack }) {
  const [activeTab, setActiveTab] = useState('daily'); 
  const [stars, setStars] = useState(initialData.stars);
  const [note, setNote] = useState(initialData.note);
  const [weeklyData, setWeeklyData] = useState(initialWeeklyData);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    setStars(initialData.stars);
    setNote(initialData.note);
  }, [initialData]);

  useEffect(() => {
    setWeeklyData(initialWeeklyData);
  }, [initialWeeklyData]);

  const setCriteriaScore = (criteriaId, score) => setStars(prev => ({ ...prev, [criteriaId]: score }));
  const handleSaveDaily = async () => {
    await onSaveDaily(student.id, date, stars, note);
    alert("Đã lưu đánh giá ngày lên hệ thống!");
  };
  const handleSaveWeekly = async () => {
    await onSaveWeekly(student.id, date, weeklyData);
    alert("Đã lưu nhận xét tuần lên hệ thống!");
  };

  const currentBaseUrl = window.location.href.split('?')[0];
  const parentLink = `${currentBaseUrl}?studentId=${student.id}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(parentLink)}`;

  if (showQR) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
          <h3 className="font-bold text-xl mb-2 text-blue-900">Mã QR Học Sinh</h3>
          <p className="text-blue-600 font-bold text-lg mb-4">{student.name}</p>
          <div className="bg-white p-2 rounded-lg inline-block mb-4 border-2 border-blue-100 shadow-inner">
             <img src={qrCodeImageUrl} alt="QR Code" className="w-48 h-48 object-contain" />
          </div>
          <div className="text-sm text-slate-500 mb-4 bg-slate-50 p-2 rounded">
            <p className="font-bold mb-1">Hướng dẫn:</p>
            Phụ huynh dùng điện thoại quét mã này để xem kết quả (Cần có mạng internet).
          </div>
          <button onClick={() => setShowQR(false)} className="w-full py-3 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold text-slate-700">Đóng</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-2xl mx-auto min-h-[80vh] flex flex-col">
      <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
      <button onClick={onBack} className="text-blue-600 flex items-center gap-1 font-medium hover:underline"><ChevronLeft size={20} /> Quay lại</button>
        <div className="text-right"><h2 className="font-bold text-lg text-blue-900">{student.name}</h2><p className="text-xs text-slate-500">Ngày làm việc: {date.split('-').reverse().join('/')}</p></div>
      </div>

      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('daily')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'daily' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><Star size={16} /> Chấm điểm Ngày</button>
        <button onClick={() => setActiveTab('weekly')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'weekly' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}><ClipboardList size={16} /> Nhận xét Tuần</button>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {activeTab === 'daily' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">5 TIÊU CHÍ RÈN LUYỆN</h3>
              <div className="space-y-4">
                {CRITERIA.map(c => (
                  <div key={c.id} className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="mb-2"><div className="font-bold text-slate-800">{c.id}. {c.title}</div><div className="text-xs text-slate-500 mt-0.5">{c.details.join(' • ')}</div></div>
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-full">
                      {[1, 2, 3, 4, 5].map((starNum) => (
                        <button key={starNum} onClick={() => setCriteriaScore(c.id, starNum)} className="flex-1 flex justify-center focus:outline-none transition-transform active:scale-110">
                          <Star size={28} className={`${starNum <= stars[c.id] ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                    <div className="text-center text-xs text-slate-400 mt-1 font-medium">Đánh giá: {stars[c.id]}/5 sao</div>
                  </div>
                ))}
              </div>
            </div>
            <div><h3 className="font-bold text-slate-700 mb-2">Ghi chú trong ngày</h3><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Hôm nay con quên khăn quàng..." className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]" /></div>
            <div className="flex gap-3 pt-4 border-t">
              <button onClick={() => setShowQR(true)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2"><QrCode size={18} /> Mã QR Học Sinh</button>
              <button onClick={handleSaveDaily} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200">Lưu Đánh Giá Ngày</button>
            </div>
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800 mb-4">
              <p className="font-bold flex items-center gap-2"><Calendar size={16}/> Tuần bắt đầu: {getMonday(date)}</p><p>Nhập nhận xét tổng kết cho tuần này.</p>
            </div>
            <div><label className="block font-bold text-slate-700 mb-2 flex items-center gap-2"><Star className="text-yellow-500 fill-yellow-500" size={18} /> Điểm nổi bật</label><textarea value={weeklyData.highlights} onChange={(e) => setWeeklyData({...weeklyData, highlights: e.target.value})} placeholder="Những mặt tốt con đã làm được trong tuần..." className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-[100px]" /></div>
            <div><label className="block font-bold text-slate-700 mb-2 flex items-center gap-2"><Edit3 className="text-blue-500" size={18} /> Điều cần cố gắng</label><textarea value={weeklyData.improvements} onChange={(e) => setWeeklyData({...weeklyData, improvements: e.target.value})} placeholder="Những điều con cần khắc phục..." className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px]" /></div>
            <div><label className="block font-bold text-slate-700 mb-2">Lời dặn dò / Nhận xét chung</label><textarea value={weeklyData.comment} onChange={(e) => setWeeklyData({...weeklyData, comment: e.target.value})} placeholder="Nhận xét chung của GVCN..." className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]" /></div>
             <div className="flex gap-3 pt-4 border-t mt-auto">
              <button onClick={handleSaveWeekly} className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2"><CheckCircle size={20} /> Lưu Nhận Xét Tuần</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ParentLogin({ students, onLogin, onBack }) {
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const handleScan = () => {
    const studentId = parseInt(inputCode);
    const student = students.find(s => s.id === studentId);
    if (student) onLogin(student); else setError('Không tìm thấy học sinh có STT này!');
  };

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><QrCode size={32} className="text-blue-600" /></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tra cứu Sổ Tay</h2>
        <p className="text-slate-500 mb-6 text-sm">Sử dụng <strong>Camera điện thoại</strong> hoặc <strong>Zalo</strong> để quét mã QR trên thẻ của con. Hoặc nhập thủ công STT bên dưới.</p>
        <div className="space-y-4">
          <input type="number" placeholder="Nhập STT (VD: 1, 5, 12...)" className="w-full p-4 text-center text-2xl tracking-widest font-bold border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-0" value={inputCode} onChange={(e) => setInputCode(e.target.value)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleScan} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200">Xem Kết Quả</button>
          <button onClick={onBack} className="w-full py-3 text-slate-500 hover:text-slate-700">Quay lại</button>
        </div>
      </div>
    </div>
  );
}

function ParentDashboard({ student, getRating, getWeeklyReview, onBack }) {
  // THÊM STATE ĐỂ PHỤ HUYNH CHỌN NGÀY
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);

  // Logic tính toán lại ngày và tuần dựa trên viewDate
  const days = [{ name: "Thứ 2", dateOffset: 0 }, { name: "Thứ 3", dateOffset: 1 }, { name: "Thứ 4", dateOffset: 2 }, { name: "Thứ 5", dateOffset: 3 }, { name: "Thứ 6", dateOffset: 4 }];
  
  // Tính ngày Thứ 2 của tuần mà Phụ huynh đang chọn xem
  const mondayDate = new Date(viewDate);
  const day = mondayDate.getDay();
  const diff = mondayDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(mondayDate.setDate(diff));

  const getDayDate = (offset) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const todayData = getRating(student.id, viewDate);
  const weeklyData = getWeeklyReview(student.id, viewDate);

  // Tính tháng hiển thị (dựa trên tuần đang xem)
  const currentMonth = monday.getMonth() + 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        
      </div>

      <div className="bg-white rounded-xl shadow-lg border-2 border-blue-600 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">Lớp {CLASS_INFO.class}</div>
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-200"><User size={32} className="text-blue-500" /></div>
          <div><h1 className="text-2xl font-bold text-slate-800">{student.name}</h1><p className="text-slate-600">GVCN: {CLASS_INFO.teacher}</p><p className="text-sm text-slate-400 mt-1">Ngày sinh: {student.dob}</p></div>
        </div>
      </div>

      {/* THANH CHỌN NGÀY (CỖ MÁY THỜI GIAN) */}
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-center justify-between">
         <span className="text-sm font-bold text-blue-800 flex items-center gap-2"><Calendar size={18} /> Xem kết quả ngày:</span>
         <input 
            type="date" 
            value={viewDate} 
            onChange={(e) => setViewDate(e.target.value)}
            className="bg-white border border-blue-300 text-blue-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 font-bold" 
          />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="font-bold text-yellow-700 mb-4 flex items-center gap-2 text-lg"><Star className="fill-yellow-500 text-yellow-500" /> KẾT QUẢ NGÀY ({viewDate.split('-').reverse().join('/')})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
             <ul className="space-y-3">
               {CRITERIA.map(c => (
                 <li key={c.id} className="bg-white p-3 rounded border border-yellow-100">
                   <div className="flex justify-between items-center mb-1"><span className="text-sm font-bold text-slate-700">{c.title}</span><span className="text-xs font-bold text-yellow-600">{todayData.stars[c.id]}/5</span></div>
                   <div className="flex gap-1">{[1, 2, 3, 4, 5].map(i => (<Star key={i} size={16} className={i <= todayData.stars[c.id] ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />))}</div>
                 </li>
               ))}
             </ul>
          </div>
          <div className="bg-white p-4 rounded-lg border border-yellow-100 h-fit">
            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Lời nhắn của cô:</div>
            <p className="text-slate-700 italic">{todayData.note ? `"${todayData.note}"` : "Chưa có nhận xét cho ngày này."}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
         <div className="bg-blue-600 text-white p-3 font-bold flex justify-between items-center"><span>BẢNG THEO DÕI TUẦN</span><span className="text-xs font-normal bg-blue-700 px-2 py-1 rounded">Tháng {currentMonth}</span></div>
         <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
               <tr><th className="p-3 border-b w-1/3">Tiêu chí</th>{days.map(d => <th key={d.name} className={`p-3 border-b text-center min-w-[50px] ${getDayDate(d.dateOffset) === viewDate ? 'bg-blue-100 text-blue-800' : ''}`}>{d.name}<br/><span className="text-[10px] font-normal">{getDayDate(d.dateOffset).split('-')[2]}/{getDayDate(d.dateOffset).split('-')[1]}</span></th>)}</tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {CRITERIA.map(c => (
                 <tr key={c.id} className="hover:bg-slate-50">
                   <td className="p-3 font-medium text-slate-700">{c.id}. {c.title}</td>
                   {days.map(d => {
                     const dateStr = getDayDate(d.dateOffset);
                     const data = getRating(student.id, dateStr);
                     const score = data.stars[c.id];
                     return (<td key={d.name} className={`p-2 text-center border-l border-slate-100 ${dateStr === viewDate ? 'bg-blue-50' : ''}`}>{score > 0 ? (<div className="flex flex-col items-center"><span className="font-bold text-yellow-600">{score}</span><Star size={12} className="fill-yellow-400 text-yellow-400" /></div>) : <span className="text-slate-200">-</span>}</td>);
                   })}
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-t-4 border-green-500">
        <div className="p-4 bg-green-50 border-b border-green-100"><h3 className="text-lg font-bold text-green-800 flex items-center gap-2"><ClipboardList /> NHẬN XÉT CUỐI TUẦN (Từ {monday.toISOString().split('T')[0].split('-').reverse().join('/')})</h3></div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2"><div className="flex items-center gap-2 font-bold text-slate-700"><Star className="text-yellow-500 fill-yellow-500" size={18} /> Điểm nổi bật</div><div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 min-h-[80px] text-sm italic text-slate-700">{weeklyData.highlights || "Chưa có nhận xét tuần này."}</div></div>
           <div className="space-y-2"><div className="flex items-center gap-2 font-bold text-slate-700"><Edit3 className="text-blue-500" size={18} /> Điều cần cố gắng</div><div className="p-4 bg-blue-50 rounded-lg border border-blue-100 min-h-[80px] text-sm italic text-slate-700">{weeklyData.improvements || "Chưa có nhận xét tuần này."}</div></div>
           <div className="md:col-span-2 space-y-2"><div className="font-bold text-slate-700">Lời dặn dò của GVCN:</div><div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 italic">{weeklyData.comment || "Giáo viên chưa nhập nhận xét cho tuần này."}</div></div>
        </div>
      </div>
      <div className="p-4 text-center text-slate-400 text-xs">Ứng dụng sổ tay điện tử - Trường Tiểu học Quế Phú</div>
    </div>
  );
}