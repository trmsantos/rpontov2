import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Button, Alert, Input, Checkbox, Form, Typography, Divider, Space, Modal, Steps } from "antd";
import {
    UserOutlined, LockOutlined, ClockCircleOutlined,
    TeamOutlined, BarChartOutlined, MailOutlined,
    CheckCircleOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { AppContext } from './App';
import { useNavigate } from 'react-router-dom';
import Logo from 'assets/logo.svg';
import jwt_decode from 'jwt-decode';

const { Title, Text } = Typography;

/* ═══════════════════════════════════════════════════════
   MODAL RECUPERAR PASSWORD
═══════════════════════════════════════════════════════ */
const ModalRecuperarPassword = ({ visible, onClose }) => {
    const [step, setStep] = useState(0);
    // step 0: introduzir email
    // step 1: definir nova password
    // step 2: sucesso

    const [email,       setEmail]       = useState('');
    const [username,    setUsername]     = useState('');
    const [fullName,    setFullName]    = useState('');
    const [password,    setPassword]    = useState('');
    const [confirm,     setConfirm]     = useState('');
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');

    const reset = () => {
        setStep(0);
        setEmail('');
        setUsername('');
        setFullName('');
        setPassword('');
        setConfirm('');
        setError('');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    /* ── Passo 1: procurar email ── */
    const handleLookup = async () => {
        if (!email.trim()) return;
        setLoading(true);
        setError('');
        try {
            const r = await axios.post('/api/password-reset/lookup/', {
                email: email.trim()
            });
            if (r.data.status === 'success') {
                setUsername(r.data.username);
                setFullName(`${r.data.first_name} ${r.data.last_name}`.trim());
                setStep(1);
            } else {
                setError(r.data.title);
            }
        } catch (e) {
            setError(e.response?.data?.title || 'Erro ao processar pedido');
        } finally {
            setLoading(false);
        }
    };

    /* ── Passo 2: definir password ── */
    const handleConfirm = async () => {
        setError('');
        if (password.length < 6) {
            setError('A palavra-passe deve ter pelo menos 6 caracteres');
            return;
        }
        if (password !== confirm) {
            setError('As palavras-passe não coincidem');
            return;
        }

        setLoading(true);
        try {
            const r = await axios.post('/api/password-reset/confirm/', {
                email: email.trim(),
                new_password: password
            });
            if (r.data.status === 'success') {
                setStep(2);
            } else {
                setError(r.data.title);
            }
        } catch (e) {
            setError(e.response?.data?.title || 'Erro ao alterar password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={visible}
            onCancel={handleClose}
            footer={null}
            title={null}
            destroyOnClose
            centered
            width={460}
        >
            <div style={{ padding: '16px 0' }}>
                {/* Header */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: 24
                }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px', boxShadow: '0 4px 12px rgba(79,70,229,0.3)'
                    }}>
                        {step === 2
                            ? <CheckCircleOutlined style={{ color: '#fff', fontSize: 24 }} />
                            : <LockOutlined style={{ color: '#fff', fontSize: 24 }} />
                        }
                    </div>
                    <Title level={4} style={{ margin: 0 }}>
                        {step === 2 ? 'Password alterada!' : 'Recuperar palavra-passe'}
                    </Title>
                </div>

                {/* Steps indicator */}
                {step < 2 && (
                    <Steps
                        current={step}
                        size="small"
                        style={{ marginBottom: 24 }}
                        items={[
                            { title: 'Identificação' },
                            { title: 'Nova password' },
                        ]}
                    />
                )}

                {/* Erro */}
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        closable
                        onClose={() => setError('')}
                        style={{ marginBottom: 16, borderRadius: 8 }}
                    />
                )}

                {/* ── STEP 0: Introduzir email ── */}
                {step === 0 && (
                    <div>
                        <Text type="secondary" style={{
                            display: 'block', marginBottom: 16, fontSize: 13
                        }}>
                            Introduza o email associado à sua conta de colaborador.
                        </Text>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{
                                fontSize: 11, fontWeight: 700,
                                color: '#666', textTransform: 'uppercase',
                                display: 'block', marginBottom: 4
                            }}>
                                Email
                            </label>
                            <Input
                                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="exemplo@elastictek.com"
                                size="large"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onPressEnter={handleLookup}
                                type="email"
                                style={{ borderRadius: 8 }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button onClick={handleClose} style={{ borderRadius: 8 }}>
                                Cancelar
                            </Button>
                            <Button
                                type="primary"
                                loading={loading}
                                onClick={handleLookup}
                                disabled={!email.trim()}
                                style={{
                                    borderRadius: 8,
                                    background: '#4F46E5',
                                    borderColor: '#4F46E5'
                                }}
                            >
                                Continuar
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── STEP 1: Definir nova password ── */}
                {step === 1 && (
                    <div>
                        {/* Info do user encontrado */}
                        <div style={{
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 20,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                                color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 900, fontSize: 16, flexShrink: 0
                            }}>
                                {(fullName || username).charAt(0)}
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, color: '#1E293B', fontSize: 14 }}>
                                    {fullName || username}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
                                    {username}
                                </div>
                                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                                    {email}
                                </div>
                            </div>
                        </div>

                        <Text type="secondary" style={{
                            display: 'block', marginBottom: 16, fontSize: 13
                        }}>
                            Defina a sua nova palavra-passe.
                        </Text>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{
                                fontSize: 11, fontWeight: 700,
                                color: '#666', textTransform: 'uppercase',
                                display: 'block', marginBottom: 4
                            }}>
                                Nova palavra-passe
                            </label>
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="Mínimo 6 caracteres"
                                size="large"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{ borderRadius: 8 }}
                            />
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{
                                fontSize: 11, fontWeight: 700,
                                color: '#666', textTransform: 'uppercase',
                                display: 'block', marginBottom: 4
                            }}>
                                Confirmar palavra-passe
                            </label>
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="Repetir palavra-passe"
                                size="large"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                onPressEnter={handleConfirm}
                                style={{ borderRadius: 8 }}
                            />
                            {password && confirm && password !== confirm && (
                                <Text type="danger" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                                    As palavras-passe não coincidem
                                </Text>
                            )}
                            {password && password.length > 0 && password.length < 6 && (
                                <Text type="warning" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                                    Mínimo 6 caracteres
                                </Text>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={() => { setStep(0); setPassword(''); setConfirm(''); setError(''); }}
                                style={{ borderRadius: 8 }}
                            >
                                Voltar
                            </Button>
                            <Button
                                type="primary"
                                loading={loading}
                                onClick={handleConfirm}
                                disabled={!password || !confirm || password !== confirm || password.length < 6}
                                style={{
                                    borderRadius: 8,
                                    background: '#4F46E5',
                                    borderColor: '#4F46E5'
                                }}
                            >
                                Alterar palavra-passe
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Sucesso ── */}
                {step === 2 && (
                    <div style={{ textAlign: 'center' }}>
                        <Alert
                            message="Palavra-passe alterada com sucesso!"
                            description={
                                <span>
                                    Pode agora fazer login com o utilizador <strong>{username}</strong> e a nova palavra-passe.
                                </span>
                            }
                            type="success"
                            showIcon
                            style={{ marginBottom: 20, borderRadius: 8, textAlign: 'left' }}
                        />
                        <Button
                            type="primary"
                            size="large"
                            block
                            onClick={handleClose}
                            style={{
                                height: 48,
                                borderRadius: 8,
                                background: '#4F46E5',
                                borderColor: '#4F46E5',
                                fontWeight: 700
                            }}
                        >
                            Ir para o Login
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};


export default () => {
    const [form] = Form.useForm();
    const { setAuth } = useContext(AppContext);
    const navigate = useNavigate();
    const [remember, setRemember]       = useState(false);
    const [loading, setLoading]         = useState(false);
    const [loginError, setLoginError]   = useState(false);
    const [errorMsg, setErrorMsg]       = useState('');
    const [showReset, setShowReset]     = useState(false);

    const handleSubmit = async (values) => {
        setLoading(true);
        setLoginError(false);
        setErrorMsg('');
        try {
            localStorage.removeItem('auth');
            const response = await axios.post('/api/token/', {
                username: values.username.trim().toUpperCase(),
                password: values.password,
                remember
            }, { withCredentials: true });

            const decodedToken = jwt_decode(response.data.access);
            const _auth = {
                access_token:  response.data.access,
                refresh_token: response.data.refresh,
                username:      values.username.trim().toUpperCase(),
                first_name:    decodedToken.first_name,
                last_name:     decodedToken.last_name,
                num:           decodedToken.num,
                email:         decodedToken.email,
                groups:        decodedToken.groups,
                isAdmin:       decodedToken.isAdmin,
                isRH:          decodedToken.isRH,
                isChefe:       decodedToken.isChefe    || false,
                deps_chefe:    decodedToken.deps_chefe || [],
                dep:           decodedToken.dep        || '',
                tp_hor:        decodedToken.tp_hor     || '',
                items:         decodedToken.items
            };

            localStorage.setItem('auth', JSON.stringify(_auth));
            axios.defaults.headers.common.Authorization = `Bearer ${_auth.access_token}`;
            setAuth({ isAuthenticated: true, ..._auth });
            navigate('/app/rh/ferias', { replace: true });
        } catch (e) {
            setLoginError(true);
            const data = e.response?.data;
            if (data?.detail) {
                setErrorMsg(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
            } else {
                setErrorMsg('Credenciais inválidas. Verifique o nº de funcionário e a palavra-passe.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2027 50%, #203a43 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                display: 'flex',
                width: '100%',
                maxWidth: '900px',
                minHeight: '500px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>
                {/* Painel esquerdo */}
                <div className="login-branding-panel" style={{
                    flex: 1,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                    backdropFilter: 'blur(10px)',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    padding: '48px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#fff'
                }}>
                    <Logo style={{ height: '80px', marginBottom: '32px', width: '100%', filter: 'brightness(0) invert(1)' }} />
                    <Title level={2} style={{ color: '#fff', margin: 0 }}>Portal RH</Title>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8, textAlign: 'center' }}>
                        Sistema de Gestão de Recursos Humanos
                    </Text>
                    <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '32px 0' }} />
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)' }}>
                            <ClockCircleOutlined style={{ fontSize: 18 }} />
                            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Registo de Picagens</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)' }}>
                            <TeamOutlined style={{ fontSize: 18 }} />
                            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Gestão de Colaboradores</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)' }}>
                            <BarChartOutlined style={{ fontSize: 18 }} />
                            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Processamento Salarial</Text>
                        </div>
                    </Space>
                </div>

                {/* Painel direito */}
                <div style={{
                    flex: 1,
                    background: '#fff',
                    padding: '48px 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <Title level={3} style={{ marginBottom: 8 }}>Bem-vindo</Title>
                    <Text type="secondary" style={{ marginBottom: 32, display: 'block' }}>
                        Introduza o seu número de funcionário para aceder
                    </Text>

                    {loginError && (
                        <Alert
                            message="Falha na autenticação"
                            description={errorMsg}
                            type="error"
                            showIcon
                            closable
                            onClose={() => setLoginError(false)}
                            style={{ marginBottom: 24, borderRadius: 8 }}
                        />
                    )}

                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item
                            name="username"
                            label={<span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Número de Funcionário</span>}
                            rules={[
                                { required: true, message: 'Introduza o nº de funcionário' },
                                { pattern: /^F\d{3,5}$/i, message: 'Formato inválido (ex: F00242)' }
                            ]}
                            normalize={v => v?.toUpperCase()}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="Ex: F00242"
                                size="large"
                                autoComplete="username"
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label={<span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Palavra-passe</span>}
                            rules={[{ required: true, message: 'Introduza a palavra-passe' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="Palavra-passe"
                                size="large"
                                autoComplete="current-password"
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Checkbox
                                    checked={remember}
                                    onChange={e => setRemember(e.target.checked)}
                                >
                                    <span style={{ fontSize: 13 }}>Manter sessão</span>
                                </Checkbox>
                                <a
                                    onClick={() => setShowReset(true)}
                                    style={{
                                        fontSize: 13,
                                        color: '#4F46E5',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Esqueci a palavra-passe
                                </a>
                            </div>
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                loading={loading}
                                style={{
                                    width: '100%',
                                    height: 48,
                                    borderRadius: 8,
                                    background: '#4F46E5',
                                    borderColor: '#4F46E5',
                                    fontWeight: 700,
                                    fontSize: 15
                                }}
                            >
                                Entrar
                            </Button>
                        </Form.Item>
                    </Form>

                    <Text type="secondary" style={{
                        display: 'block', textAlign: 'center',
                        marginTop: 24, fontSize: 11, color: '#aaa'
                    }}>
                        Acesso exclusivo para colaboradores
                    </Text>
                </div>
            </div>

            <ModalRecuperarPassword
                visible={showReset}
                onClose={() => setShowReset(false)}
            />
        </div>
    );
};