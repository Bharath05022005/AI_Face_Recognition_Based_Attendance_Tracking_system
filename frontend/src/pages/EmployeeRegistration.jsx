import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, UserCheck, ShieldAlert, Camera, Check, ShieldCheck, ChevronRight, Trash2, Search, Users } from 'lucide-react';
import ApiService from '../utils/api';

const EmployeeRegistration = () => {
    // Stage 1: Employee Form details, Stage 2: Camera Capture wizard
    const [wizardStage, setWizardStage] = useState(1);
    
    // Form fields
    const [empId, setEmpId] = useState('');
    const [fullName, setFullName] = useState('');
    const [deptId, setDeptId] = useState('');
    const [designation, setDesignation] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [departments, setDepartments] = useState([]);
    const [employeesList, setEmployeesList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // UI controls
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Capture Wizard state variables
    const [cameraStream, setCameraStream] = useState(null);
    const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
    const [sampleProgress, setSampleProgress] = useState(0); // number of successfully registered frames
    const [wizardLog, setWizardLog] = useState('Position yourself in front of the camera.');
    
    const videoRef = useRef(null);
    const streamActiveRef = useRef(false);
    const currentAngleIndexRef = useRef(0);
    const wizardStageRef = useRef(1);

    useEffect(() => {
        currentAngleIndexRef.current = currentAngleIndex;
    }, [currentAngleIndex]);

    useEffect(() => {
        wizardStageRef.current = wizardStage;
    }, [wizardStage]);

    // Face capture angles target
    const angles = [
        { id: 'front', label: 'Look Center (Front View)', samplesNeeded: 10 },
        { id: 'left', label: 'Turn Head Left Profile', samplesNeeded: 10 },
        { id: 'right', label: 'Turn Head Right Profile', samplesNeeded: 10 },
        { id: 'up', label: 'Look Slightly Upward', samplesNeeded: 10 },
        { id: 'down', label: 'Look Slightly Downward', samplesNeeded: 10 }
    ];

    const fetchEmployees = async () => {
        try {
            const list = await ApiService.get("/employees");
            setEmployeesList(list);
        } catch (err) {
            console.error("Failed to fetch employees:", err);
        }
    };

    // Load departments and employees list on mount
    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const depts = await ApiService.get("/departments");
                setDepartments(depts);
            } catch (err) {
                console.error("Departments load error:", err);
            }
        };
        fetchDepts();
        fetchEmployees();
    }, []);

    // Clean up camera stream on unmount
    useEffect(() => {
        return () => {
            stopCameraWebcam();
        };
    }, []);

    const startCameraWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraStream(stream);
            streamActiveRef.current = true;
            setError('');
        } catch (err) {
            setError("Could not access local system webcam. Ensure camera permission is granted.");
            setWizardStage(1);
        }
    };

    const stopCameraWebcam = () => {
        streamActiveRef.current = false;
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!empId || !fullName || !designation || !email) {
            setError("Please fill in all required employee fields.");
            return;
        }

        setError('');
        setLoading(true);

        try {
            // Register Employee Profile
            await ApiService.post("/employees", {
                id: empId,
                name: fullName,
                department_id: deptId ? parseInt(deptId) : null,
                designation: designation,
                phone: phone,
                email: email,
                address: address
            });

            // If profile success, switch to camera capture wizard
            setWizardStage(2);
            fetchEmployees();
            setTimeout(() => {
                startCameraWebcam();
            }, 100);
        } catch (err) {
            setError(err.message || "Failed to create employee profile.");
        } finally {
            setLoading(false);
        }
    };

    // Frame-by-frame enrollment capture controller loop
    const captureFrameAndRegister = async () => {
        if (!streamActiveRef.current || !videoRef.current) return;

        const currentAngleIdx = currentAngleIndexRef.current;
        const currentAngle = angles[currentAngleIdx];
        
        // Take video frame canvas snapshot
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        const base64Frame = canvas.toDataURL("image/jpeg");

        try {
            // Upload to backend face enrollment API
            const result = await ApiService.post("/face/register-frame", {
                employee_id: empId,
                frame_b64: base64Frame,
                angle: currentAngle.id
            });

            if (result.success) {
                // Set absolute progress bar
                setSampleProgress(result.samples_captured);
                setWizardLog(`Sample registered successfully for ${currentAngle.id} angle.`);

                // Check if current angle has enough samples
                const currentAngleTotalSamples = result.samples_captured;
                // Calculate targets
                const totalSamplesTarget = (currentAngleIdx + 1) * 10; // 10 samples per angle, total 50 samples
                
                if (currentAngleTotalSamples >= totalSamplesTarget) {
                    if (currentAngleIdx < angles.length - 1) {
                        // Progress to next angle
                        setCurrentAngleIndex(currentAngleIdx + 1);
                        setWizardLog(`Perfect! Now ${angles[currentAngleIdx + 1].label}.`);
                    } else {
                        // Registration complete!
                        stopCameraWebcam();
                        setWizardStage(3);
                        setSuccessMessage(`Face profile generated successfully with ${result.samples_captured} aligned templates!`);
                        fetchEmployees();
                    }
                }
            } else {
                setWizardLog(result.message);
            }
        } catch (err) {
            console.error("Frame enrollment error:", err);
            setWizardLog("Network sync lag. Adjusting capture rate...");
        }

        // Loop next frame capture snapshot
        if (streamActiveRef.current && wizardStageRef.current === 2) {
            setTimeout(captureFrameAndRegister, 400); // 400ms delay between uploads for smooth, accurate preprocessing
        }
    };

    // Launch capturing once camera stream is active
    useEffect(() => {
        if (cameraStream && wizardStage === 2) {
            // Wait 2 seconds for camera warm up before capturing
            setWizardLog("Webcam warming up... Get ready!");
            const startTimer = setTimeout(() => {
                captureFrameAndRegister();
            }, 2000);
            return () => clearTimeout(startTimer);
        }
    }, [cameraStream, wizardStage]);

    const handleRestartRegistration = () => {
        setWizardStage(1);
        setEmpId('');
        setFullName('');
        setDeptId('');
        setDesignation('');
        setPhone('');
        setEmail('');
        setAddress('');
        setCurrentAngleIndex(0);
        setSampleProgress(0);
        setWizardLog('Position yourself in front of the camera.');
        setError('');
        setSuccessMessage('');
    };

    const handleDeleteEmployee = async (employeeId) => {
        if (!window.confirm(`Are you sure you want to delete employee ${employeeId}? This will permanently remove all associated face embeddings and attendance records.`)) {
            return;
        }

        try {
            setError('');
            await ApiService.delete(`/employees/${employeeId}`);
            setSuccessMessage(`Employee profile ${employeeId} deleted successfully.`);
            // Refresh employee list
            fetchEmployees();
        } catch (err) {
            setError(err.message || `Failed to delete employee ${employeeId}.`);
        }
    };

    const filteredEmployees = employeesList.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="content-wrapper">
            {wizardStage === 1 ? (
                <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'stretch' }}>
                    {/* Left Column: Form Card */}
                    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                            <UserPlus size={24} style={{ color: 'var(--primary)' }} />
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Employee Face Registration</h2>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Add credentials and compile high-accuracy 3D-angled face templates</p>
                            </div>
                        </div>

                        {error && (
                            <div className="badge badge-absent" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                                <ShieldAlert size={16} />
                                <span style={{ marginLeft: '8px' }}>{error}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="badge badge-present" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success)' }}>
                                <ShieldCheck size={16} />
                                <span style={{ marginLeft: '8px' }}>{successMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Employee ID (EMP-XXXX) *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. EMP-101"
                                    value={empId}
                                    onChange={(e) => setEmpId(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter employee full name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select 
                                    className="form-input" 
                                    value={deptId} 
                                    onChange={(e) => setDeptId(e.target.value)}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Designation *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Software Engineer"
                                    value={designation}
                                    onChange={(e) => setDesignation(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="Enter contact number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email Address *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Enter corporate email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Address</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter residential address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button type="submit" className="btn btn-primary" disabled={loading} style={{ gap: '10px' }}>
                                    <span>{loading ? "Registering profile..." : "Proceed to Face Capture"}</span>
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Registered Employees List Card */}
                    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Users size={24} style={{ color: 'var(--info)' }} />
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Registered Staff</h2>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{employeesList.length} registered profiles</p>
                                </div>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search by ID or Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: '38px', width: '100%' }}
                            />
                        </div>

                        {/* Employees List Container */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
                            {filteredEmployees.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', margin: '40px 0' }}>
                                    No registered employees found.
                                </p>
                            ) : (
                                filteredEmployees.map(emp => (
                                    <div key={emp.id} className="glass-card" style={{
                                        padding: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.01)',
                                        border: '1px solid var(--border-color)',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</span>
                                                <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--bg-input)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>{emp.id}</span>
                                            </div>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{emp.designation} • <span style={{ color: 'var(--primary)' }}>{emp.department_name || 'No Dept'}</span></span>
                                        </div>

                                        <button
                                            className="btn"
                                            onClick={() => handleDeleteEmployee(emp.id)}
                                            style={{
                                                padding: '8px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                                color: 'var(--danger)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--danger)';
                                                e.currentTarget.style.color = '#fff';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                                                e.currentTarget.style.color = 'var(--danger)';
                                            }}
                                            title="Delete Employee Profile"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
                        <UserPlus size={24} style={{ color: 'var(--primary)' }} />
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Employee Face Registration</h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Add credentials and compile high-accuracy 3D-angled face templates</p>
                        </div>
                    </div>

                    {error && (
                        <div className="badge badge-absent" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                            <ShieldAlert size={16} />
                            <span style={{ marginLeft: '8px' }}>{error}</span>
                        </div>
                    )}

                    {/* STAGE 2: Camera Capture Wizard */}
                    {wizardStage === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <span style={{ color: 'var(--primary)' }}>Target Angle: {angles[currentAngleIndex].label}</span>
                                    <span>Captured: {sampleProgress} / 50 samples</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                    <div style={{ 
                                        width: `${(sampleProgress / 50) * 100}%`, 
                                        height: '100%', 
                                        background: 'linear-gradient(90deg, var(--primary), var(--info))',
                                        borderRadius: 'var(--radius-full)',
                                        transition: 'width var(--transition-normal)'
                                    }}></div>
                                </div>
                            </div>

                            <div style={{
                                position: 'relative',
                                width: '480px',
                                height: '360px',
                                backgroundColor: '#000',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                                border: '2px solid var(--border-glow)',
                                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)'
                            }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transform: 'scaleX(-1)' // Mirror camera
                                    }}
                                ></video>

                                {/* Alignment Box Overlay to guide the user */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '220px',
                                    height: '280px',
                                    border: '2px dashed rgba(255,255,255,0.4)',
                                    borderRadius: '110px / 140px',
                                    pointerEvents: 'none'
                                }}></div>
                            </div>

                            {/* Interactive Status Log */}
                            <div className="glass-card" style={{ width: '100%', padding: '16px', borderLeft: '4px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Camera size={18} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {wizardLog}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* STAGE 3: Enrollment Success Message */}
                    {wizardStage === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '40px 0' }}>
                            <div style={{
                                width: '72px',
                                height: '72px',
                                backgroundColor: 'var(--success-bg)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--success-text)',
                                border: '1.5px solid var(--success)'
                            }}>
                                <ShieldCheck size={40} />
                            </div>

                            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Enrollment Complete!</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                                    {successMessage}
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button onClick={handleRestartRegistration} className="btn btn-primary">
                                    Register Another Employee
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployeeRegistration;
