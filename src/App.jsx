import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Sparkles,
  MapPin,
  MessageCircle,
  DollarSign,
  Plus,
  Trash2,
  Edit3,
  Search,
  AlertTriangle,
  ShieldAlert,
  Settings,
  Download,
  RefreshCw,
  ChevronRight,
  X,
  Lock,
  Scissors,
  CheckCircle2,
  CalendarCheck,
  LogOut
} from 'lucide-react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

// --- DADOS INICIAIS (SEED DATA) ---
const INITIAL_SERVICES = [
  { id: '1', nome: 'Design de Sobrancelhas Personalizado', duracao: 30, preco: 35.00, descricao: 'Mapeamento facial, alinhamento simétrico e finalização com alta frequência.' },
  { id: '2', nome: 'Design com Aplicação de Henna Premium', duracao: 45, preco: 50.00, descricao: 'Design estratégico com pigmentação de alta fixação e efeito ombré.' },
  { id: '3', nome: 'Brow Lamination & Nutrição', duracao: 60, preco: 90.00, descricao: 'Alinhamento dos fios naturais para um efeito volumoso, moderno e nutrido.' },
  { id: '4', nome: 'Epilação Facial Completa (Linha/Cera)', duracao: 45, preco: 60.00, descricao: 'Remoção delicada dos pelos faciais mantendo a barreira de proteção cutânea.' },
  { id: '5', nome: 'Epilação Buço & Queixo', duracao: 20, preco: 25.00, descricao: 'Remoção suave e higiênica para uma pele macia e sem irritação.' },
  { id: '6', nome: 'Lash Lifting de Cílios', duracao: 60, preco: 85.00, descricao: 'Curvatura e tintura dos cílios naturais com tratamento de queratina.' }
];

const INITIAL_CLIENTS = [
  {
    id: 'c1',
    nome: 'Maria Eduarda Silveira',
    telefone: '88998765432',
    alergias: 'Alergia leve à Henna com amônia',
    usandoAcidos: true,
    roacutan: false,
    observacoes: 'Pele sensível na região frontal. Prefere tom mais natural.',
    ultimoProcedimentoData: '2026-11-05',
    ultimoServico: 'Design com Aplicação de Henna Premium'
  },
  {
    id: 'c2',
    nome: 'Ana Clara Lima',
    telefone: '88991234567',
    alergias: 'Nenhuma',
    usandoAcidos: false,
    roacutan: false,
    observacoes: 'Gosta do arco bem marcado.',
    ultimoProcedimentoData: '2026-10-28',
    ultimoServico: 'Brow Lamination & Nutrição'
  }
];

const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-1',
    clienteNome: 'Maria Eduarda Silveira',
    clienteTelefone: '88998765432',
    servicoId: '1',
    servicoNome: 'Design de Sobrancelhas Personalizado',
    preco: 35.00,
    data: '2026-11-22',
    horario: '09:00',
    status: 'confirmado'
  },
  {
    id: 'apt-2',
    clienteNome: 'Ana Clara Lima',
    clienteTelefone: '88991234567',
    servicoId: '3',
    servicoNome: 'Brow Lamination & Nutrição',
    preco: 90.00,
    data: '2026-11-22',
    horario: '10:30',
    status: 'confirmado'
  }
];

const INITIAL_TRANSACTIONS = [
  { id: 't1', tipo: 'receita', descricao: 'Atendimento - Maria Eduarda', valor: 35.00, data: '2026-11-22' },
  { id: 't2', tipo: 'despesa', descricao: 'Reposição de Kit Cera & Algodão', valor: 45.00, data: '2026-11-20' }
];

const INITIAL_CONFIG = {
  studioName: 'Geissy Silva Studio',
  ownerName: 'Geissy Silva',
  specialty: 'Epilação Feminina & Design de Sobrancelhas',
  studioPhone: '5588999999999',
  address: 'Córrego dos Rodrigues - Aracati, CE',
  workStart: '08:00',
  workEnd: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00'
};

// Retorna a data atual no fuso horário local no formato YYYY-MM-DD
const getTodayLocalStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function App() {
  // --- ESTADOS DE NAVEGAÇÃO E AUTENTICAÇÃO ---
  const [activeTab, setActiveTab] = useState('public_booking');
  const [adminUser, setAdminUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // --- DADOS SINCRONIZADOS COM FIRESTORE ---
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // --- RELÓGIO INTERNO PARA ATUALIZAR HORÁRIOS PASSADOS AUTOMATICAMENTE ---
  const [currentMinuteTick, setCurrentMinuteTick] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinuteTick(now.getHours() * 60 + now.getMinutes());
    }, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  // --- MONITORAR LOGIN ADMIN ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
    });
    return () => unsub();
  }, []);

  // --- ESCUTAR ALTERAÇÕES EM TEMPO REAL NO FIRESTORE ---
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'settings', 'studio_config'), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      if (!snap.empty) {
        setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    });

    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubAppointments = onSnapshot(collection(db, 'appointments'), (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubConfig();
      unsubServices();
      unsubClients();
      unsubAppointments();
      unsubTransactions();
    };
  }, []);

  // --- ESTADO DO FLUXO DE AGENDAMENTO PÚBLICO ---
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayLocalStr);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientForm, setClientForm] = useState({ nome: '', telefone: '', observacao: '' });
  const [completedBooking, setCompletedBooking] = useState(null);
  const [bookingStep, setBookingStep] = useState(1);

  // --- ESTADOS ADMIN ---
  const [filterDate, setFilterDate] = useState(getTodayLocalStr);
  const [searchClient, setSearchClient] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    id: '',
    nome: '',
    telefone: '',
    alergias: '',
    usandoAcidos: false,
    roacutan: false,
    observacoes: ''
  });

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({ id: '', nome: '', duracao: '30', preco: '', descricao: '' });
  const [newTrans, setNewTrans] = useState({ tipo: 'receita', descricao: '', valor: '' });
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // --- LOGIN E LOGOUT ADMIN ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setActiveTab('admin_agenda');
      showToast('Bem-vinda de volta, Geissy!');
    } catch (err) {
      showToast('E-mail ou senha inválidos. Verifique seus dados.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await signOut(auth);
    setActiveTab('public_booking');
    showToast('Sessão encerrada.');
  };

  // --- ALTERAR STATUS DO AGENDAMENTO (CONFIRMADO / ATENDIDO / CANCELADO) ---
  const handleUpdateAppointmentStatus = async (aptId, newStatus) => {
    try {
      await updateDoc(doc(db, 'appointments', aptId), { status: newStatus });
      const labels = {
        confirmado: 'Confirmado',
        atendido: 'Atendido',
        cancelado: 'Cancelado'
      };
      showToast(`Status alterado para ${labels[newStatus] || newStatus}!`);
    } catch (error) {
      console.error(error);
      showToast('Erro ao atualizar status do agendamento.');
    }
  };

  // --- GERADOR DE SLOTS DE HORÁRIO (15 EM 15 MIN + BLOQUEIO DE HORÁRIO PASSADO) ---
  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedDate) return [];

    const slots = [];
    const [startH, startM] = config.workStart.split(':').map(Number);
    const [endH, endM] = config.workEnd.split(':').map(Number);
    const [lunchStartH, lunchStartM] = config.lunchStart.split(':').map(Number);
    const [lunchEndH, lunchEndM] = config.lunchEnd.split(':').map(Number);

    let current = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const lunchStartMinutes = lunchStartH * 60 + lunchStartM;
    const lunchEndMinutes = lunchEndH * 60 + lunchEndM;

    const todayStr = getTodayLocalStr();
    const isToday = selectedDate === todayStr;
    const isPastDate = selectedDate < todayStr;

    const bookedOnDate = appointments.filter(a => a.data === selectedDate && a.status !== 'cancelado');

    while (current + selectedService.duracao <= endMinutes) {
      const currentEnd = current + selectedService.duracao;
      const isPastTime = isPastDate || (isToday && current <= currentMinuteTick);
      const isDuringLunch = (current < lunchEndMinutes && currentEnd > lunchStartMinutes);

      const hasConflict = bookedOnDate.some(apt => {
        const aptServico = services.find(s => s.id === apt.servicoId);
        const aptDuracao = aptServico ? aptServico.duracao : 30;
        const [aptH, aptM] = apt.horario.split(':').map(Number);
        const aptStart = aptH * 60 + aptM;
        const aptEnd = aptStart + aptDuracao;

        return (current < aptEnd && currentEnd > aptStart);
      });

      const hours = Math.floor(current / 60).toString().padStart(2, '0');
      const mins = (current % 60).toString().padStart(2, '0');
      const timeString = `${hours}:${mins}`;

      slots.push({
        time: timeString,
        available: !isPastTime && !isDuringLunch && !hasConflict,
        reason: isPastTime ? 'Passou' : isDuringLunch ? 'Almoço' : hasConflict ? 'Ocupado' : null
      });

      current += 15;
    }

    return slots;
  }, [selectedService, selectedDate, appointments, config, services, currentMinuteTick]);

  // Limpa o horário selecionado se o relógio avançar e ele ficar no passado
  useEffect(() => {
    if (!selectedTime) return;
    const slotObj = availableSlots.find(s => s.time === selectedTime);
    if (slotObj && !slotObj.available) {
      setSelectedTime('');
    }
  }, [availableSlots, selectedTime]);

  const formatDateBR = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // --- LINKS WHATSAPP ---
  const getClientToStudioWhatsAppUrl = (booking) => {
    if (!booking) return '#';
    const cleanPhone = config.studioPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const dataFormatted = formatDateBR(booking.data);
    const message =
      `Olá Geissy! ✨ Acabei de agendar um horário pelo site do *Geissy Silva Studio*:\n\n` +
      `💆‍♀️ *Procedimento:* ${booking.servicoNome}\n` +
      `📅 *Data:* ${dataFormatted}\n` +
      `⏰ *Horário:* ${booking.horario}\n` +
      `👤 *Cliente:* ${booking.clienteNome} (${booking.clienteTelefone})\n\n` +
      `Aguardo sua confirmação! 💕`;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  };

  const getStudioToClientWhatsAppUrl = (apt) => {
    if (!apt) return '#';
    const cleanPhone = apt.clienteTelefone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const dataFormatted = formatDateBR(apt.data);
    const message =
      `Olá *${apt.clienteNome}*! ✨ Passando para confirmar seu agendamento no *Geissy Silva Studio*:\n\n` +
      `💆‍♀️ *Procedimento:* ${apt.servicoNome}\n` +
      `📅 *Data:* ${dataFormatted}\n` +
      `⏰ *Horário:* ${apt.horario}\n` +
      `📍 *Local:* ${config.address}\n\n` +
      `Podemos confirmar sua presença? 💕`;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  };

  const getReturnReminderWhatsAppUrl = (client, days) => {
    if (!client) return '#';
    const cleanPhone = client.telefone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message =
      `Olá *${client.nome}*! ✨ Tudo bem? Já se passaram ${days} dias desde o seu último atendimento de *${client.ultimoServico || 'Design/Epilação'}* no *Geissy Silva Studio*!\n\n` +
      `Que tal agendar a sua manutenção para manter seu olhar impecável e a pele radiante? 💖\n\n` +
      `📍 ${config.address}\n` +
      `Agende também pelo nosso site!`;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  };

  // --- FINALIZAR AGENDAMENTO PÚBLICO (SALVA NO FIRESTORE) ---
  const handleCompleteBooking = async (e) => {
    e.preventDefault();
    if (!clientForm.nome || !clientForm.telefone || !selectedTime) {
      showToast('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const newAptData = {
        clienteNome: clientForm.nome,
        clienteTelefone: clientForm.telefone,
        servicoId: selectedService.id,
        servicoNome: selectedService.nome,
        preco: Number(selectedService.preco),
        data: selectedDate,
        horario: selectedTime,
        observacao: clientForm.observacao || '',
        status: 'confirmado'
      };

      const docRef = await addDoc(collection(db, 'appointments'), newAptData);

      const cleanTel = clientForm.telefone.replace(/\D/g, '');
      const existingClient = clients.find(c => c.telefone.replace(/\D/g, '') === cleanTel);

      if (existingClient) {
        await updateDoc(doc(db, 'clients', existingClient.id), {
          ultimoProcedimentoData: selectedDate,
          ultimoServico: selectedService.nome
        });
      } else {
        await addDoc(collection(db, 'clients'), {
          nome: clientForm.nome,
          telefone: clientForm.telefone,
          alergias: 'Não informada',
          usandoAcidos: false,
          roacutan: false,
          observacoes: clientForm.observacao || '',
          ultimoProcedimentoData: selectedDate,
          ultimoServico: selectedService.nome
        });
      }

      setCompletedBooking({ id: docRef.id, ...newAptData });
      setBookingStep(4);
      showToast('Agendamento realizado com sucesso!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar agendamento. Verifique a conexão.');
    }
  };

  const resetPublicBooking = () => {
    setSelectedService(null);
    setSelectedDate(getTodayLocalStr());
    setSelectedTime('');
    setClientForm({ nome: '', telefone: '', observacao: '' });
    setCompletedBooking(null);
    setBookingStep(1);
  };

  // --- POPULAR DADOS INICIAIS NO FIRESTORE ---
  const handleSeedData = async () => {
    if (!window.confirm('Deseja enviar os serviços e dados iniciais para o banco de dados na nuvem?')) return;
    try {
      const batch = writeBatch(db);

      batch.set(doc(db, 'settings', 'studio_config'), INITIAL_CONFIG);

      INITIAL_SERVICES.forEach((s) => {
        const { id, ...data } = s;
        batch.set(doc(db, 'services', id), data);
      });

      INITIAL_CLIENTS.forEach((c) => {
        const { id, ...data } = c;
        batch.set(doc(db, 'clients', id), data);
      });

      INITIAL_APPOINTMENTS.forEach((a) => {
        const { id, ...data } = a;
        batch.set(doc(db, 'appointments', id), data);
      });

      INITIAL_TRANSACTIONS.forEach((t) => {
        const { id, ...data } = t;
        batch.set(doc(db, 'transactions', id), data);
      });

      await batch.commit();
      showToast('Banco de dados populado com sucesso!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao popular banco. Confira as regras do Firestore.');
    }
  };

  // --- CRUD CLIENTES NO FIRESTORE ---
  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!clientFormData.nome || !clientFormData.telefone) {
      showToast('Nome e Telefone são obrigatórios');
      return;
    }

    try {
      const { id, ...data } = clientFormData;
      if (id) {
        await updateDoc(doc(db, 'clients', id), data);
        showToast('Ficha de Anamnese atualizada!');
      } else {
        await addDoc(collection(db, 'clients'), data);
        showToast('Cliente cadastrada com sucesso!');
      }
      setIsClientModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar cliente.');
    }
  };

  // --- CRUD SERVIÇOS E PREÇOS NO FIRESTORE ---
  const handleSaveService = async (e) => {
    e.preventDefault();
    const numericPrice = parseFloat(String(serviceFormData.preco).replace(',', '.')) || 0;
    const numericDuration = parseInt(serviceFormData.duracao, 10) || 15;

    if (!serviceFormData.nome || numericPrice <= 0) {
      showToast('Informe o nome e um preço maior que zero.');
      return;
    }

    try {
      const { id, ...rawData } = serviceFormData;
      const data = {
        ...rawData,
        duracao: numericDuration,
        preco: numericPrice
      };

      if (id) {
        await setDoc(doc(db, 'services', id), data, { merge: true });
        showToast('Serviço e preço atualizados na nuvem!');
      } else {
        await addDoc(collection(db, 'services'), data);
        showToast('Novo serviço cadastrado!');
      }
      setIsServiceModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar serviço no Firebase.');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      await deleteDoc(doc(db, 'services', id));
      showToast('Serviço removido.');
    } catch (error) {
      console.error(error);
      showToast('Erro ao excluir serviço.');
    }
  };

  // --- SALVAR CONFIGURAÇÕES NO FIRESTORE ---
  const handleSaveConfig = async () => {
    try {
      await setDoc(doc(db, 'settings', 'studio_config'), config, { merge: true });
      showToast('Configurações salvas na nuvem com sucesso!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar configurações.');
    }
  };

  // --- LANÇAR CAIXA FINANCEIRO NO FIRESTORE ---
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTrans.descricao || !newTrans.valor) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        tipo: newTrans.tipo,
        descricao: newTrans.descricao,
        valor: parseFloat(newTrans.valor),
        data: getTodayLocalStr()
      });
      setNewTrans({ tipo: 'receita', descricao: '', valor: '' });
      showToast('Lançamento registrado no caixa!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao registrar lançamento.');
    }
  };

  const exportFinanceCSV = () => {
    let csv = 'Data;Tipo;Descrição;Valor (R$)\n';
    transactions.forEach(t => {
      csv += `${formatDateBR(t.data)};${t.tipo.toUpperCase()};${t.descricao};${Number(t.valor).toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_caixa_geissy_silva_${getTodayLocalStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalReceitas = transactions.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = transactions.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + Number(t.valor), 0);
  const saldoCaixa = totalReceitas - totalDespesas;

  const getStatusBadgeStyle = (status) => {
    if (status === 'atendido') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'cancelado') return 'bg-red-100 text-red-700 border-red-300';
    return 'bg-amber-100 text-amber-800 border-amber-300';
  };

  return (
    <div className="min-h-screen bg-[#FDF8F9] text-[#4A3531] font-sans flex flex-col antialiased">

      {/* NOTIFICAÇÃO TOAST */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#4A3531] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-[#C97A8E]/30">
          <Sparkles className="w-5 h-5 text-[#C97A8E]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HEADER / NAVEGAÇÃO PRINCIPAL */}
      <header className="bg-white border-b border-[#F4E4E6] sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">

          {/* BRANDING */}
          <div className="flex items-center sm:space-x-3 cursor-pointer" onClick={() => setActiveTab('public_booking')}>
            <div className="hidden sm:flex w-11 h-11 bg-gradient-to-tr from-[#C97A8E] to-[#E6AAB8] rounded-full items-center justify-center text-white shadow-md shrink-0 overflow-hidden">
              <img
                src={`${import.meta.env.BASE_URL}logo.jpg`}
                alt="Geissy Silva Studio"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#4A3531] font-serif leading-tight">
                {config.studioName}
              </h1>
              <p className="text-[11px] sm:text-xs text-[#7A5C55] flex items-center mt-0.5">
                <MapPin className="w-3 h-3 mr-1 text-[#C97A8E] shrink-0" />
                <span>{config.address}</span>
              </p>
            </div>
          </div>

          {/* NAVEGAÇÃO ENTRE VISÃO CLIENTE E PAINEL ADMIN */}
          <nav className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={() => { setActiveTab('public_booking'); resetPublicBooking(); }}
              className={`p-2.5 sm:px-4 sm:py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center sm:space-x-2 ${
                activeTab === 'public_booking'
                  ? 'bg-[#C97A8E] text-white shadow-sm'
                  : 'text-[#7A5C55] hover:bg-[#FDF8F9]'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Agendamento Online</span>
            </button>

            <button
              onClick={() => setActiveTab(adminUser ? 'admin_agenda' : 'admin_login')}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap ${
                activeTab !== 'public_booking'
                  ? 'bg-[#C97A8E] text-white shadow-sm'
                  : 'bg-[#FDF8F9] text-[#7A5C55] hover:bg-[#F4E4E6]'
              }`}
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Painel Admin</span>
            </button>
          </nav>
        </div>

        {/* SUBMENU ADMIN (VISÍVEL APENAS QUANDO LOGADA) */}
        {adminUser && activeTab.startsWith('admin_') && activeTab !== 'admin_login' && (
          <div className="bg-[#4A3531] text-white text-xs border-t border-[#7A5C55]/30">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto py-2.5 scrollbar-none">
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('admin_agenda')}
                  className={`flex items-center space-x-1.5 whitespace-nowrap pb-0.5 ${activeTab === 'admin_agenda' ? 'text-[#C97A8E] font-bold border-b-2 border-[#C97A8E]' : 'text-gray-300 hover:text-white'}`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Agenda do Dia</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_clients')}
                  className={`flex items-center space-x-1.5 whitespace-nowrap pb-0.5 ${activeTab === 'admin_clients' ? 'text-[#C97A8E] font-bold border-b-2 border-[#C97A8E]' : 'text-gray-300 hover:text-white'}`}
                >
                  <User className="w-4 h-4" />
                  <span>Clientes & Anamnese</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_services')}
                  className={`flex items-center space-x-1.5 whitespace-nowrap pb-0.5 ${activeTab === 'admin_services' ? 'text-[#C97A8E] font-bold border-b-2 border-[#C97A8E]' : 'text-gray-300 hover:text-white'}`}
                >
                  <Scissors className="w-4 h-4" />
                  <span>Serviços & Preços</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_finance')}
                  className={`flex items-center space-x-1.5 whitespace-nowrap pb-0.5 ${activeTab === 'admin_finance' ? 'text-[#C97A8E] font-bold border-b-2 border-[#C97A8E]' : 'text-gray-300 hover:text-white'}`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Caixa Simples</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_config')}
                  className={`flex items-center space-x-1.5 whitespace-nowrap pb-0.5 ${activeTab === 'admin_config' ? 'text-[#C97A8E] font-bold border-b-2 border-[#C97A8E]' : 'text-gray-300 hover:text-white'}`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Configurações</span>
                </button>
              </div>

              <button
                onClick={handleAdminLogout}
                className="ml-6 flex items-center space-x-1 text-rose-200 hover:text-white whitespace-nowrap"
                title="Sair do Painel Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* =================================================================== */}
        {/* TELA DE LOGIN DO PAINEL ADMIN                                       */}
        {/* =================================================================== */}
        {activeTab === 'admin_login' && !adminUser && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-[#F4E4E6] shadow-lg space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-[#FDF8F9] text-[#C97A8E] rounded-full flex items-center justify-center mx-auto border border-[#E6AAB8]/40">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[#4A3531] font-serif">Acesso Administrativo</h2>
              <p className="text-xs text-[#7A5C55]">Área restrita para gestão de agenda, preços e clientes.</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#7A5C55] mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="geissy@studio.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C97A8E] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#7A5C55] mb-1">Senha</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C97A8E] outline-none text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-[#4A3531] hover:bg-[#382724] transition-all shadow-md"
              >
                {loginLoading ? 'Entrando...' : 'Entrar no Painel'}
              </button>
            </form>
          </div>
        )}

        {/* =================================================================== */}
        {/* VISÃO 1: AGENDAMENTO PÚBLICO (CLIENTE -> ESTÚDIO)                    */}
        {/* =================================================================== */}
        {activeTab === 'public_booking' && (
          <div className="max-w-3xl mx-auto space-y-8">

            {/* BANNER INSTITUCIONAL & QUEM É GEISSY SILVA */}
          <div className="bg-gradient-to-r from-[#F4E4E6] to-[#FDF8F9] rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E6AAB8]/30 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#C97A8E] p-1 shadow-lg">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white">
                    <img
                      src={`${import.meta.env.BASE_URL}perfil.jpg`}
                      alt="Geissy Silva"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
              </div>
              <div className="text-center sm:text-left flex-1">
                <span className="text-xs uppercase tracking-widest text-[#C97A8E] font-bold">Atendimento Exclusivo</span>
                <h2 className="text-2xl font-bold text-[#4A3531] font-serif mt-1">{config.ownerName}</h2>
                <p className="text-sm text-[#7A5C55] mt-1 leading-relaxed">
                  Especialista em Epilação Feminina & Design de Sobrancelhas. Realce sua beleza natural com técnicas delicadas e biossegurança em {config.address}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start text-xs font-medium text-[#4A3531]">
                  <span className="bg-white/80 px-3 py-1 rounded-full border border-[#E6AAB8]/40">Design Simétrico</span>
                  <span className="bg-white/80 px-3 py-1 rounded-full border border-[#E6AAB8]/40">Epilação Suave</span>
                  <span className="bg-white/80 px-3 py-1 rounded-full border border-[#E6AAB8]/40">Atendimento Personalizado</span>
                </div>
              </div>
            </div>

            {/* ETAPA DE NAVEGAÇÃO INTERATIVA */}
            {bookingStep < 4 && (
              <div className="flex items-center justify-between border-b border-[#F4E4E6] pb-4">
                <div className={`flex items-center space-x-2 ${bookingStep >= 1 ? 'text-[#C97A8E] font-bold' : 'text-gray-400'}`}>
                  <span className="w-7 h-7 rounded-full bg-[#F4E4E6] flex items-center justify-center text-xs">1</span>
                  <span className="text-sm hidden sm:inline">Serviço</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <div className={`flex items-center space-x-2 ${bookingStep >= 2 ? 'text-[#C97A8E] font-bold' : 'text-gray-400'}`}>
                  <span className="w-7 h-7 rounded-full bg-[#F4E4E6] flex items-center justify-center text-xs">2</span>
                  <span className="text-sm hidden sm:inline">Data & Horário</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <div className={`flex items-center space-x-2 ${bookingStep >= 3 ? 'text-[#C97A8E] font-bold' : 'text-gray-400'}`}>
                  <span className="w-7 h-7 rounded-full bg-[#F4E4E6] flex items-center justify-center text-xs">3</span>
                  <span className="text-sm hidden sm:inline">Seus Dados</span>
                </div>
              </div>
            )}

            {/* PASSO 1: SELEÇÃO DE SERVIÇOS */}
            {bookingStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#4A3531] flex items-center">
                  <Scissors className="w-5 h-5 mr-2 text-[#C97A8E]" />
                  Selecione o procedimento desejado:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((servico) => (
                    <div
                      key={servico.id}
                      onClick={() => {
                        setSelectedService(servico);
                        setBookingStep(2);
                      }}
                      className="bg-white p-5 rounded-2xl border border-[#F4E4E6] hover:border-[#C97A8E] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-[#4A3531] text-base group-hover:text-[#C97A8E] transition-colors">
                            {servico.nome}
                          </h4>
                          <span className="font-bold text-[#C97A8E] text-lg whitespace-nowrap">
                            R$ {Number(servico.preco).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-[#7A5C55] mt-2 leading-relaxed">
                          {servico.descricao}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-[#C97A8E]" />
                          Duração: {servico.duracao} min
                        </span>
                        <span className="text-[#C97A8E] font-semibold flex items-center group-hover:translate-x-1 transition-transform">
                          Escolher <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PASSO 2: DATA E GRADE INTELIGENTE DE HORÁRIOS */}
            {bookingStep === 2 && selectedService && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#F4E4E6] shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-xs text-[#7A5C55]">Procedimento selecionado:</span>
                    <h3 className="text-lg font-bold text-[#4A3531]">{selectedService.nome}</h3>
                    <p className="text-xs text-[#C97A8E] font-semibold">R$ {Number(selectedService.preco).toFixed(2)} • {selectedService.duracao} min</p>
                  </div>
                  <button
                    onClick={() => setBookingStep(1)}
                    className="text-xs text-[#7A5C55] hover:text-[#4A3531] underline"
                  >
                    Trocar
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#4A3531] mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-[#C97A8E]" />
                    Escolha a data da sua sessão:
                  </label>
                  <input
                    type="date"
                    min={getTodayLocalStr()}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime('');
                    }}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl border border-[#E6AAB8]/50 focus:ring-2 focus:ring-[#C97A8E] outline-none text-[#4A3531] font-medium bg-[#FDF8F9]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#4A3531] mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-[#C97A8E]" />
                    Horários disponíveis para {formatDateBR(selectedDate)}:
                  </label>

                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhum horário disponível nesta data.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                            selectedTime === slot.time
                              ? 'bg-[#C97A8E] text-white shadow-md scale-105 ring-2 ring-[#C97A8E]'
                              : slot.available
                              ? 'bg-[#FDF8F9] text-[#4A3531] hover:bg-[#F4E4E6] border border-[#E6AAB8]/30'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 line-through opacity-60'
                          }`}
                        >
                          <span>{slot.time}</span>
                          {!slot.available && (
                            <span className="text-[9px] font-normal no-underline opacity-75">{slot.reason}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                  <button
                    onClick={() => setBookingStep(1)}
                    className="px-5 py-2.5 text-xs font-semibold text-[#7A5C55] hover:bg-[#FDF8F9] rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    disabled={!selectedTime}
                    onClick={() => setBookingStep(3)}
                    className={`px-6 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                      selectedTime ? 'bg-[#4A3531] hover:bg-[#382724]' : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Avançar para Seus Dados
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 3: DADOS DA CLIENTE */}
            {bookingStep === 3 && (
              <form onSubmit={handleCompleteBooking} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#F4E4E6] shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-[#4A3531] flex items-center border-b border-gray-100 pb-3">
                  <User className="w-5 h-5 mr-2 text-[#C97A8E]" />
                  Preencha suas informações de contato:
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#7A5C55] mb-1">
                      Seu Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Amanda Souza"
                      value={clientForm.nome}
                      onChange={(e) => setClientForm({ ...clientForm, nome: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C97A8E] outline-none text-sm text-[#4A3531]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#7A5C55] mb-1">
                      WhatsApp (Com DDD) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: 88 99999-9999"
                      value={clientForm.telefone}
                      onChange={(e) => setClientForm({ ...clientForm, telefone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C97A8E] outline-none text-sm text-[#4A3531]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#7A5C55] mb-1">
                      Observações ou Histórico de Alergias (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Tenho alergia a cera quente, uso ácido retinóico..."
                      value={clientForm.observacao}
                      onChange={(e) => setClientForm({ ...clientForm, observacao: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C97A8E] outline-none text-sm text-[#4A3531]"
                    />
                  </div>
                </div>

                <div className="bg-[#FDF8F9] p-4 rounded-2xl border border-[#E6AAB8]/40 space-y-1 text-xs text-[#7A5C55]">
                  <p className="font-bold text-[#4A3531] text-sm mb-1">Resumo da Reserva:</p>
                  <p><strong>Procedimento:</strong> {selectedService.nome}</p>
                  <p><strong>Data:</strong> {formatDateBR(selectedDate)} às {selectedTime}</p>
                  <p><strong>Valor:</strong> R$ {Number(selectedService.preco).toFixed(2)}</p>
                  <p><strong>Local:</strong> {config.address}</p>
                </div>

                <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setBookingStep(2)}
                    className="px-5 py-2.5 text-xs font-semibold text-[#7A5C55] hover:bg-[#FDF8F9] rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#C97A8E] to-[#b36376] hover:opacity-95 transition-all shadow-md flex items-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir Agendamento</span>
                  </button>
                </div>
              </form>
            )}

            {/* PASSO 4: CONFIRMAÇÃO */}
            {bookingStep === 4 && completedBooking && (
              <div className="bg-white p-8 rounded-3xl border border-[#F4E4E6] shadow-xl text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <span className="text-xs font-bold text-[#C97A8E] uppercase tracking-widest">Reserva Solicitada com Sucesso</span>
                  <h3 className="text-2xl font-bold text-[#4A3531] font-serif mt-1">Quase lá, {completedBooking.clienteNome}!</h3>
                  <p className="text-sm text-[#7A5C55] mt-2 max-w-md mx-auto">
                    Para finalizar e garantir seu horário na agenda de {config.ownerName}, envie o comprovante do agendamento para o WhatsApp do estúdio abaixo.
                  </p>
                </div>

                <div className="bg-[#FDF8F9] p-6 rounded-2xl border border-[#E6AAB8]/40 text-left max-w-md mx-auto space-y-2 text-sm">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500">Procedimento:</span>
                    <span className="font-bold text-[#4A3531]">{completedBooking.servicoNome}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500">Data:</span>
                    <span className="font-bold text-[#4A3531]">{formatDateBR(completedBooking.data)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500">Horário:</span>
                    <span className="font-bold text-[#4A3531]">{completedBooking.horario}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor Total:</span>
                    <span className="font-bold text-[#C97A8E]">R$ {Number(completedBooking.preco).toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 max-w-md mx-auto space-y-3">
                  <a
                    href={getClientToStudioWhatsAppUrl(completedBooking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-all shadow-lg flex items-center justify-center space-x-2"
                  >
                    <MessageCircle className="w-5 h-5 fill-current" />
                    <span>Enviar Comprovante no WhatsApp do Estúdio</span>
                  </a>

                  <button
                    onClick={resetPublicBooking}
                    className="text-xs text-[#7A5C55] hover:text-[#4A3531] underline pt-2 block mx-auto"
                  >
                    Fazer outro agendamento
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* VISÃO 2: ADMIN - AGENDA DO DIA                                       */}
        {/* =================================================================== */}
        {adminUser && activeTab === 'admin_agenda' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#F4E4E6] shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-[#4A3531] font-serif">Agenda de Atendimentos</h2>
                <p className="text-xs text-[#7A5C55]">Gerencie os horários marcados e atualize o status do atendimento.</p>
              </div>

              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold text-[#7A5C55]">Data:</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200 outline-none text-sm text-[#4A3531] bg-[#FDF8F9]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appointments
                .filter(a => a.data === filterDate)
                .sort((a, b) => a.horario.localeCompare(b.horario))
                .map((apt) => (
                  <div
                    key={apt.id}
                    className={`bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      apt.status === 'cancelado' ? 'border-red-200 opacity-75' : 'border-[#F4E4E6]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center gap-2">
                        <span className="px-3 py-1 bg-[#F4E4E6] text-[#4A3531] font-bold text-sm rounded-lg flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-[#C97A8E]" /> {apt.horario}
                        </span>

                        {/* SELETOR MANUAL DE STATUS: CONFIRMADO / ATENDIDO / CANCELADO */}
                        <select
                          value={apt.status}
                          onChange={(e) => handleUpdateAppointmentStatus(apt.id, e.target.value)}
                          aria-label="Status do agendamento"
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer outline-none uppercase tracking-wide ${getStatusBadgeStyle(apt.status)}`}
                        >
                          <option value="confirmado">Confirmado</option>
                          <option value="atendido">Atendido</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>

                      <div>
                        <h4 className={`font-bold text-[#4A3531] text-base ${apt.status === 'cancelado' ? 'line-through text-gray-400' : ''}`}>
                          {apt.clienteNome}
                        </h4>
                        <p className="text-xs text-[#7A5C55] flex items-center mt-0.5">
                          <Phone className="w-3 h-3 mr-1 text-gray-400" /> {apt.clienteTelefone}
                        </p>
                      </div>

                      <div className="bg-[#FDF8F9] p-3 rounded-xl border border-gray-100 text-xs text-[#4A3531]">
                        <p className="font-semibold">{apt.servicoNome}</p>
                        <p className="text-[#C97A8E] font-bold mt-1">R$ {Number(apt.preco).toFixed(2)}</p>
                        {apt.observacao && (
                          <p className="text-gray-500 text-[11px] mt-1 italic">Obs: {apt.observacao}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <a
                        href={getStudioToClientWhatsAppUrl(apt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-xs font-bold border border-green-200 flex items-center justify-center space-x-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Confirmar no WhatsApp</span>
                      </a>

                      <button
                        onClick={async () => {
                          await deleteDoc(doc(db, 'appointments', apt.id));
                          showToast('Agendamento excluído.');
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50"
                        title="Excluir agendamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {appointments.filter(a => a.data === filterDate).length === 0 && (
              <div className="bg-white p-12 rounded-3xl border border-[#F4E4E6] text-center text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#C97A8E]" />
                <p className="text-sm font-medium">Nenhum agendamento para {formatDateBR(filterDate)}.</p>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* VISÃO 3: ADMIN - CLIENTES & FICHA DE ANAMNESE CLINICA               */}
        {/* =================================================================== */}
        {adminUser && activeTab === 'admin_clients' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#F4E4E6] shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-[#4A3531] font-serif">Clientes & Anamnese Clínica</h2>
                <p className="text-xs text-[#7A5C55]">Histórico de atendimentos, alertas de uso de ácidos e lealdade.</p>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 outline-none text-xs text-[#4A3531]"
                  />
                </div>
                <button
                  onClick={() => {
                    setClientFormData({
                      id: '',
                      nome: '',
                      telefone: '',
                      alergias: '',
                      usandoAcidos: false,
                      roacutan: false,
                      observacoes: ''
                    });
                    setIsClientModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#4A3531] text-white rounded-xl text-xs font-bold flex items-center space-x-1 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Cliente</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients
                .filter(c => c.nome.toLowerCase().includes(searchClient.toLowerCase()) || c.telefone.includes(searchClient))
                .map((client) => (
                  <div key={client.id} className="bg-white p-5 rounded-2xl border border-[#F4E4E6] shadow-sm space-y-4">
                    <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                      <div>
                        <h4 className="font-bold text-[#4A3531] text-base">{client.nome}</h4>
                        <p className="text-xs text-gray-500 flex items-center mt-0.5">
                          <Phone className="w-3 h-3 mr-1 text-[#C97A8E]" /> {client.telefone}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setClientFormData(client);
                          setIsClientModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-[#4A3531] rounded-lg"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex flex-wrap gap-2">
                        {client.usandoAcidos && (
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md font-bold flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Usa Ácido Retinóico/Glicólico
                          </span>
                        )}
                        {client.roacutan && (
                          <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-md font-bold flex items-center">
                            <ShieldAlert className="w-3 h-3 mr-1" /> Uso de Roacutan
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600">
                        <strong>Alergias / Sensibilidade:</strong> {client.alergias || 'Nenhuma declarada'}
                      </p>
                      {client.observacoes && (
                        <p className="text-gray-500 italic">
                          <strong>Obs:</strong> {client.observacoes}
                        </p>
                      )}

                      {client.ultimoProcedimentoData && (
                        <p className="text-[#C97A8E] font-medium pt-1">
                          Último procedimento: {client.ultimoServico} em {formatDateBR(client.ultimoProcedimentoData)}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-400 font-medium text-[11px]">Lembrete de Retorno:</span>
                      <div className="flex space-x-2">
                        <a
                          href={getReturnReminderWhatsAppUrl(client, 15)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-[#FDF8F9] hover:bg-[#F4E4E6] text-[#4A3531] rounded-lg font-bold border border-[#E6AAB8]/40 flex items-center space-x-1"
                        >
                          <MessageCircle className="w-3 h-3 text-green-600" />
                          <span>15 Dias</span>
                        </a>
                        <a
                          href={getReturnReminderWhatsAppUrl(client, 25)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-[#FDF8F9] hover:bg-[#F4E4E6] text-[#4A3531] rounded-lg font-bold border border-[#E6AAB8]/40 flex items-center space-x-1"
                        >
                          <MessageCircle className="w-3 h-3 text-green-600" />
                          <span>25 Dias</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VISÃO 4: ADMIN - SERVIÇOS E PREÇOS                                 */}
        {/* =================================================================== */}
        {adminUser && activeTab === 'admin_services' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#F4E4E6] shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-[#4A3531] font-serif">Catálogo de Serviços</h2>
                <p className="text-xs text-[#7A5C55]">Configure o tempo de atendimento e preços exibidos para as clientes em tempo real.</p>
              </div>

              <button
                onClick={() => {
                  setServiceFormData({ id: '', nome: '', duracao: '30', preco: '', descricao: '' });
                  setIsServiceModalOpen(true);
                }}
                className="px-4 py-2 bg-[#4A3531] text-white rounded-xl text-xs font-bold flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Serviço</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((servico) => (
                <div key={servico.id} className="bg-white p-5 rounded-2xl border border-[#F4E4E6] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-[#4A3531] text-base">{servico.nome}</h4>
                      <span className="font-bold text-[#C97A8E] text-base whitespace-nowrap">R$ {Number(servico.preco).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{servico.descricao}</p>
                    <p className="text-xs font-semibold text-[#7A5C55] mt-3 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-[#C97A8E]" /> {servico.duracao} minutos
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setServiceFormData({
                          ...servico,
                          duracao: String(servico.duracao ?? ''),
                          preco: servico.preco !== undefined && servico.preco !== null ? String(servico.preco) : ''
                        });
                        setIsServiceModalOpen(true);
                      }}
                      className="p-2 text-gray-500 hover:text-[#4A3531] rounded-lg"
                      title="Editar Serviço ou Preço"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(servico.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                      title="Excluir Serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VISÃO 5: ADMIN - CAIXA SIMPLES & FINANCEIRO                         */}
        {/* =================================================================== */}
        {adminUser && activeTab === 'admin_finance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-[#F4E4E6] shadow-sm">
                <span className="text-xs text-gray-500 font-bold uppercase">Entradas (Receitas)</span>
                <p className="text-2xl font-bold text-green-600 mt-1">R$ {totalReceitas.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-[#F4E4E6] shadow-sm">
                <span className="text-xs text-gray-500 font-bold uppercase">Saídas (Despesas)</span>
                <p className="text-2xl font-bold text-red-500 mt-1">R$ {totalDespesas.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-[#F4E4E6] shadow-sm">
                <span className="text-xs text-gray-500 font-bold uppercase">Saldo em Caixa</span>
                <p className={`text-2xl font-bold mt-1 ${saldoCaixa >= 0 ? 'text-[#4A3531]' : 'text-red-600'}`}>
                  R$ {saldoCaixa.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#F4E4E6] shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-[#4A3531] text-base">Registrar Lançamento no Caixa</h3>
                <button
                  onClick={exportFinanceCSV}
                  className="px-3 py-1.5 bg-[#FDF8F9] hover:bg-[#F4E4E6] text-[#4A3531] border border-[#E6AAB8]/40 rounded-xl text-xs font-bold flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5 text-[#C97A8E]" />
                  <span>Exportar Relatório (CSV)</span>
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  value={newTrans.tipo}
                  onChange={(e) => setNewTrans({ ...newTrans, tipo: e.target.value })}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none bg-white text-[#4A3531]"
                >
                  <option value="receita">Entrada (+)</option>
                  <option value="despesa">Saída (-)</option>
                </select>

                <input
                  type="text"
                  placeholder="Descrição (ex: Henna, Cera, Atendimento)"
                  value={newTrans.descricao}
                  onChange={(e) => setNewTrans({ ...newTrans, descricao: e.target.value })}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs outline-none text-[#4A3531]"
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor (R$)"
                  value={newTrans.valor}
                  onChange={(e) => setNewTrans({ ...newTrans, valor: e.target.value })}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs outline-none text-[#4A3531]"
                />

                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#4A3531] text-white rounded-xl text-xs font-bold hover:bg-[#382724]"
                >
                  Adicionar
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-[#F4E4E6] shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs text-[#4A3531]">
                <thead className="bg-[#FDF8F9] border-b border-gray-100 font-bold uppercase text-gray-500">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4 text-right">Valor</th>
                    <th className="p-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{formatDateBR(t.data)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          t.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {t.tipo.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">{t.descricao}</td>
                      <td className={`p-4 text-right font-bold ${t.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.tipo === 'receita' ? '+' : '-'} R$ {Number(t.valor).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={async () => {
                            await deleteDoc(doc(db, 'transactions', t.id));
                            showToast('Lançamento removido.');
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VISÃO 6: ADMIN - CONFIGURAÇÕES DO ESTÚDIO                           */}
        {/* =================================================================== */}
        {adminUser && activeTab === 'admin_config' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-[#F4E4E6] shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-[#4A3531] font-serif border-b border-gray-100 pb-3">
              Configurações do Estúdio
            </h2>

            <div className="space-y-4 text-xs text-[#4A3531]">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome do Estúdio</label>
                <input
                  type="text"
                  value={config.studioName}
                  onChange={(e) => setConfig({ ...config, studioName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">WhatsApp Oficial do Estúdio (com DDI 55 + DDD)</label>
                <input
                  type="text"
                  value={config.studioPhone}
                  onChange={(e) => setConfig({ ...config, studioPhone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm font-mono"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Ex: 5588999999999. Este número receberá as mensagens diretas de agendamento das clientes pelo site.
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Endereço / Localidade</label>
                <input
                  type="text"
                  value={config.address}
                  onChange={(e) => setConfig({ ...config, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Horário de Início do Expediente</label>
                  <input
                    type="time"
                    value={config.workStart}
                    onChange={(e) => setConfig({ ...config, workStart: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Horário de Término do Expediente</label>
                  <input
                    type="time"
                    value={config.workEnd}
                    onChange={(e) => setConfig({ ...config, workEnd: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Início do Almoço (Bloqueio)</label>
                  <input
                    type="time"
                    value={config.lunchStart}
                    onChange={(e) => setConfig({ ...config, lunchStart: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Fim do Almoço (Bloqueio)</label>
                  <input
                    type="time"
                    value={config.lunchEnd}
                    onChange={(e) => setConfig({ ...config, lunchEnd: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <button
                type="button"
                onClick={handleSeedData}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-red-600 flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span>Popular / Restaurar Dados no Firebase</span>
              </button>

              <button
                type="button"
                onClick={handleSaveConfig}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#4A3531] text-white text-xs font-bold rounded-xl hover:bg-[#382724]"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        )}

      </main>

      {/* MODAL CADASTRAR/EDITAR CLIENTE */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-[#4A3531] text-lg font-serif">
                {clientFormData.id ? 'Editar Cliente / Ficha' : 'Nova Cliente'}
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs text-[#4A3531]">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={clientFormData.nome}
                  onChange={(e) => setClientFormData({ ...clientFormData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={clientFormData.telefone}
                  onChange={(e) => setClientFormData({ ...clientFormData, telefone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"
                />
              </div>

              <div className="bg-[#FDF8F9] p-4 rounded-2xl border border-[#E6AAB8]/40 space-y-3">
                <span className="font-bold text-[#C97A8E] block uppercase tracking-wider text-[10px]">
                  Ficha de Anamnese Clínica
                </span>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientFormData.usandoAcidos}
                    onChange={(e) => setClientFormData({ ...clientFormData, usandoAcidos: e.target.checked })}
                    className="rounded text-[#C97A8E] focus:ring-[#C97A8E] w-4 h-4"
                  />
                  <span className="font-medium">Faz uso de ácidos faciais (Retinóico, Glicólico, Salicílico)?</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientFormData.roacutan}
                    onChange={(e) => setClientFormData({ ...clientFormData, roacutan: e.target.checked })}
                    className="rounded text-[#C97A8E] focus:ring-[#C97A8E] w-4 h-4"
                  />
                  <span className="font-medium">Está em tratamento com Isotretinoína (Roacutan)?</span>
                </label>

                <div>
                  <label className="block font-semibold mb-1">Alergias ou Sensibilidades Conhecidas:</label>
                  <input
                    type="text"
                    placeholder="Ex: Alergia a henna com amônia, cera quente..."
                    value={clientFormData.alergias}
                    onChange={(e) => setClientFormData({ ...clientFormData, alergias: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Observações Gerais</label>
                <textarea
                  rows={2}
                  value={clientFormData.observacoes}
                  onChange={(e) => setClientFormData({ ...clientFormData, observacoes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 text-gray-500 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#4A3531] text-white rounded-xl font-bold hover:bg-[#382724]"
                >
                  Salvar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR/EDITAR SERVIÇO */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-[#4A3531] text-lg font-serif">
                {serviceFormData.id ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs text-[#4A3531]">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  value={serviceFormData.nome}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, nome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Duração (Minutos) *</label>
                  <input
                    type="number"
                    step="15"
                    min="15"
                    required
                    value={serviceFormData.duracao}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, duracao: e.target.value })}
                    onBlur={() => {
                      if (!serviceFormData.duracao) {
                        setServiceFormData({ ...serviceFormData, duracao: '15' });
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={serviceFormData.preco}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, preco: e.target.value })}
                    onBlur={() => {
                      if (serviceFormData.preco === '' || serviceFormData.preco === null || serviceFormData.preco === undefined) {
                        setServiceFormData({ ...serviceFormData, preco: '0' });
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descrição Comercial</label>
                <textarea
                  rows={3}
                  value={serviceFormData.descricao}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, descricao: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-gray-500 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#4A3531] text-white rounded-xl font-bold hover:bg-[#382724]"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-[#F4E4E6] py-6 text-center text-xs text-[#7A5C55] mt-auto">
        <p>© {new Date().getFullYear()} {config.studioName} • {config.specialty}</p>
        <p className="mt-1 text-[11px] text-gray-400">Atendimento em {config.address}</p>
      </footer>
    </div>
  );
}