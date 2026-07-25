document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. THEME TOGGLE LOGIC
    // ==========================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        htmlElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        htmlElement.setAttribute('data-theme', 'light');
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // ==========================================
    // 2. UTILITIES
    // ==========================================
    const formatINR = (num) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(num);
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const syncInputAndSlider = (sliderId, inputId) => {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        if (slider && input) {
            slider.addEventListener('input', () => {
                input.value = slider.value;
                if(sliderId === 'emi-amount') calculateNewLoanEMI();
            });
            input.addEventListener('input', () => {
                slider.value = input.value;
                if(sliderId === 'emi-amount') calculateNewLoanEMI();
            });
        }
    };
    syncInputAndSlider('emi-amount', 'emi-amount-input');
    syncInputAndSlider('emi-tenure', 'emi-tenure-input');

    // ==========================================
    // 3. VIEW ROUTING
    // ==========================================
    const views = document.querySelectorAll('.app-view');
    const showView = (viewId) => {
        views.forEach(v => v.style.display = 'none');
        document.getElementById(viewId).style.display = 'block';
        window.scrollTo(0, 0);
        if(window.lucide) window.lucide.createIcons();
    };

    document.getElementById('btn-nav-new-loan').addEventListener('click', () => {
        // Default start date to today
        document.getElementById('new-start-date').valueAsDate = new Date();
        showView('view-new-loan');
    });
    document.getElementById('btn-back-dashboard').addEventListener('click', () => {
        renderDashboard();
        showView('view-dashboard');
    });
    document.getElementById('btn-back-dashboard-2').addEventListener('click', () => {
        renderDashboard();
        showView('view-dashboard');
    });

    // Profile Tabs
    const profileTabs = document.querySelectorAll('#view-profile .calc-tab-btn');
    const profilePanels = document.querySelectorAll('#view-profile .calc-content-panel');
    profileTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            profileTabs.forEach(b => b.classList.remove('active'));
            profilePanels.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // ==========================================
    // 4. DATA LOGIC (LOCAL STORAGE)
    // ==========================================
    const STORAGE_KEY = 'popular_motors_crm';
    let currentActiveCustomerId = null;

    const getRecords = () => JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const saveRecords = (records) => localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    
    const getCustomer = (id) => getRecords().find(r => r.id === id);
    const updateCustomer = (updatedRecord) => {
        let records = getRecords();
        records = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
        saveRecords(records);
    };

    const calculateOutstanding = (record) => {
        const totalPaid = (record.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const totalLateFees = (record.lateFees || []).reduce((sum, f) => sum + f.amount, 0);
        return (record.totalPayable + totalLateFees) - totalPaid;
    };

    // ==========================================
    // 5. DASHBOARD CONTROLLER
    // ==========================================
    const renderDashboard = () => {
        const records = getRecords();
        const tbody = document.getElementById('customer-table-body');
        const listToday = document.getElementById('list-due-today');
        const listTomorrow = document.getElementById('list-due-tomorrow');
        
        tbody.innerHTML = '';
        listToday.innerHTML = '';
        listTomorrow.innerHTML = '';
        
        let totalOutstanding = 0;
        let todayCount = 0;
        let tomorrowCount = 0;
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayDay = today.getDate();
        const tomorrowDay = tomorrow.getDate();

        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-secondary);">No customers yet. Click "New Loan Entry" to start.</td></tr>`;
        }

        records.sort((a,b) => b.timestamp - a.timestamp).forEach(record => {
            const outBalance = calculateOutstanding(record);
            totalOutstanding += outBalance;

            // Check Due Dates (ignoring month, just checking the day)
            const startDate = new Date(record.startDate);
            const dueDay = startDate.getDate();
            
            if (outBalance > 0) { // Only active loans
                if (dueDay === todayDay) {
                    listToday.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between;">
                        <span><strong>${record.customerName}</strong> (${record.vehicleNumber})</span>
                        <span style="color:#ef4444; font-weight:600;">${formatINR(record.emi)}</span>
                    </li>`;
                    todayCount++;
                } else if (dueDay === tomorrowDay) {
                    listTomorrow.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between;">
                        <span><strong>${record.customerName}</strong> (${record.vehicleNumber})</span>
                        <span style="color:#f59e0b; font-weight:600;">${formatINR(record.emi)}</span>
                    </li>`;
                    tomorrowCount++;
                }
            }

            // Table Row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600;">${record.customerName}</td>
                <td>${record.mobileNumber}</td>
                <td><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-family: monospace;">${record.vehicleNumber}</span></td>
                <td style="color: var(--accent); font-weight: 600;">${formatINR(record.emi)}</td>
                <td style="font-weight: 600; color: ${outBalance <= 0 ? '#22c55e' : 'var(--text)'}">${outBalance <= 0 ? 'Settled' : formatINR(outBalance)}</td>
                <td style="text-align: center;">
                    <button class="btn btn-outline btn-view-profile" data-id="${record.id}" style="padding: 6px 12px; font-size: 0.85rem;">
                        View Profile
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if(todayCount === 0) listToday.innerHTML = '<li style="color:var(--text-secondary); padding:8px 0;">No dues today.</li>';
        if(tomorrowCount === 0) listTomorrow.innerHTML = '<li style="color:var(--text-secondary); padding:8px 0;">No dues tomorrow.</li>';

        document.getElementById('kpi-customers').textContent = records.length;
        document.getElementById('kpi-outstanding').textContent = formatINR(totalOutstanding);

        // Bind profile buttons
        document.querySelectorAll('.btn-view-profile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = Number(e.currentTarget.getAttribute('data-id'));
                openCustomerProfile(id);
            });
        });

        if(window.lucide) window.lucide.createIcons();
    };

    // ==========================================
    // 6. CUSTOMER PROFILE CONTROLLER
    // ==========================================
    const openCustomerProfile = (id) => {
        currentActiveCustomerId = id;
        const record = getCustomer(id);
        if (!record) return;

        // Render Header
        document.getElementById('profile-name').textContent = record.customerName;
        document.getElementById('profile-vehicle').textContent = record.vehicleNumber;
        document.getElementById('profile-mobile').textContent = record.mobileNumber;
        document.getElementById('profile-call-btn').href = `tel:${record.mobileNumber}`;
        document.getElementById('profile-start-date').textContent = formatDate(record.startDate);

        renderProfileData(record);
        
        // Reset forms
        document.getElementById('pay-amount').value = '';
        document.getElementById('pay-date').valueAsDate = new Date();
        document.getElementById('profile-late-days').value = 5;
        document.getElementById('profile-late-days-val').textContent = '5 Days';

        showView('view-profile');
    };

    const renderProfileData = (record) => {
        const totalPaid = (record.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const totalLateFees = (record.lateFees || []).reduce((sum, f) => sum + f.amount, 0);
        const outBalance = calculateOutstanding(record);
        
        const isSettled = outBalance <= 0;

        // Summary
        document.getElementById('summary-principal').textContent = formatINR(record.loanAmount);
        document.getElementById('summary-emi').textContent = formatINR(record.emi);
        document.getElementById('summary-payable').textContent = formatINR(record.totalPayable + totalLateFees);
        document.getElementById('summary-paid').textContent = formatINR(totalPaid);
        document.getElementById('summary-outstanding').textContent = isSettled ? 'SETTLED' : formatINR(outBalance);

        // Payment Tab Suggestion
        document.getElementById('suggest-emi').textContent = `Full EMI (${formatINR(record.emi)})`;
        document.getElementById('suggest-emi').onclick = (e) => {
            e.preventDefault();
            document.getElementById('pay-amount').value = record.emi;
        };

        // Late Fee Tab Init
        document.getElementById('lbl-late-emi').textContent = formatINR(record.emi);
        updateProfileLateFeeCalc(record);

        // Settlement Tab Init
        updateProfileSettlementCalc(record, totalPaid);

        // Ledger
        const tbody = document.getElementById('ledger-table-body');
        tbody.innerHTML = '';
        
        let allLedgerItems = [];
        (record.payments || []).forEach(p => allLedgerItems.push({...p, isFee: false}));
        (record.lateFees || []).forEach(f => allLedgerItems.push({...f, isFee: true}));
        
        allLedgerItems.sort((a,b) => new Date(b.date) - new Date(a.date));

        if(allLedgerItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:16px; color:var(--text-secondary);">No history found.</td></tr>`;
        }

        allLedgerItems.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:12px;">${formatDate(item.date)}</td>
                <td style="padding:12px;">
                    <span style="background: ${item.isFee ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'}; color: ${item.isFee ? '#ef4444' : '#22c55e'}; padding: 4px 8px; border-radius: 4px; font-size:0.85rem; font-weight:600;">
                        ${item.isFee ? `Late Fee (${item.days} days)` : 'Payment'}
                    </span>
                </td>
                <td style="padding:12px; font-weight:600; color: ${item.isFee ? '#ef4444' : '#22c55e'};">
                    ${item.isFee ? '+' : '-'}${formatINR(item.amount)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    // --- Profile Actions: Payment ---
    document.getElementById('btn-save-payment').addEventListener('click', () => {
        if(!currentActiveCustomerId) return;
        const record = getCustomer(currentActiveCustomerId);
        
        const amount = parseInt(document.getElementById('pay-amount').value);
        const date = document.getElementById('pay-date').value;

        if(!amount || amount <= 0 || !date) {
            alert("Enter valid amount and date.");
            return;
        }

        if(!record.payments) record.payments = [];
        record.payments.push({ id: Date.now(), amount, date, type: 'Manual' });
        
        updateCustomer(record);
        renderProfileData(record);
        document.getElementById('pay-amount').value = '';
    });

    // --- Profile Actions: Late Fee ---
    const profileLateDaysSlider = document.getElementById('profile-late-days');
    const updateProfileLateFeeCalc = (record) => {
        const days = parseInt(profileLateDaysSlider.value);
        document.getElementById('profile-late-days-val').textContent = `${days} Day${days !== 1 ? 's' : ''}`;
        const fee = record.emi * 0.001 * days; // 0.1% of EMI per day
        document.getElementById('profile-late-fee-amt').textContent = formatINR(fee);
        return { days, fee };
    };

    profileLateDaysSlider.addEventListener('input', () => {
        if(currentActiveCustomerId) updateProfileLateFeeCalc(getCustomer(currentActiveCustomerId));
    });

    document.getElementById('btn-apply-late-fee').addEventListener('click', () => {
        if(!currentActiveCustomerId) return;
        const record = getCustomer(currentActiveCustomerId);
        const { days, fee } = updateProfileLateFeeCalc(record);
        
        if(!record.lateFees) record.lateFees = [];
        record.lateFees.push({ id: Date.now(), amount: fee, days, date: new Date().toISOString().split('T')[0] });
        
        updateCustomer(record);
        renderProfileData(record);
    });

    // --- Profile Actions: Settlement ---
    const updateProfileSettlementCalc = (record, totalPaid) => {
        const P = record.loanAmount;
        const totalMonths = record.tenureMonths;
        const timing = document.querySelector('#profile-settle-timing .active').getAttribute('data-value');
        
        // Approximate completed months based on payments made / EMI amount
        const completedMonths = Math.floor(totalPaid / record.emi);
        let effectiveCompletedMonths = completedMonths;
        
        if (timing === 'after-due') effectiveCompletedMonths += 1;
        if (effectiveCompletedMonths > totalMonths) effectiveCompletedMonths = totalMonths;

        const principalPerMonth = P / totalMonths;
        const repaidPrincipal = principalPerMonth * effectiveCompletedMonths;
        let outstandingPrincipal = P - repaidPrincipal;

        if (effectiveCompletedMonths === totalMonths) {
            outstandingPrincipal = 0;
        }

        const remainingContractAmount = record.emi * (totalMonths - completedMonths);
        const interestSaved = Math.max(0, remainingContractAmount - outstandingPrincipal);

        document.getElementById('prof-settle-months-paid').textContent = completedMonths;
        document.getElementById('prof-settle-interest-saved').textContent = formatINR(interestSaved);
        document.getElementById('prof-settle-total').textContent = formatINR(outstandingPrincipal);
    };

    document.querySelectorAll('#profile-settle-timing .segment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#profile-settle-timing .segment-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if(currentActiveCustomerId) {
                const record = getCustomer(currentActiveCustomerId);
                const totalPaid = (record.payments || []).reduce((sum, p) => sum + p.amount, 0);
                updateProfileSettlementCalc(record, totalPaid);
            }
        });
    });

    // --- Profile Actions: Delete ---
    document.getElementById('btn-delete-customer').addEventListener('click', () => {
        if(!currentActiveCustomerId) return;
        if(confirm('WARNING: This will permanently delete this customer and all payment history. Continue?')) {
            let records = getRecords();
            records = records.filter(r => r.id !== currentActiveCustomerId);
            saveRecords(records);
            currentActiveCustomerId = null;
            renderDashboard();
            showView('view-dashboard');
        }
    });

    // ==========================================
    // 7. NEW LOAN CALCULATOR LOGIC
    // ==========================================
    const emiAmountSlider = document.getElementById('emi-amount');
    const emiTenureSlider = document.getElementById('emi-tenure');
    const emiAgeSegmentBtns = document.querySelectorAll('#emi-age-segment .segment-btn');
    let emiVehicleAge = 'under8';

    emiAgeSegmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            emiAgeSegmentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            emiVehicleAge = btn.getAttribute('data-value');
            calculateNewLoanEMI();
        });
    });

    const calculateNewLoanEMI = () => {
        const P = parseInt(emiAmountSlider.value);
        const N = parseInt(emiTenureSlider.value);

        const monthlyRate = emiVehicleAge === 'under8' ? 0.015 : 0.016;
        
        // Flat Rate Interest Calculation
        const totalInterest = P * monthlyRate * N;
        const totalRepayable = P + totalInterest;
        const emi = totalRepayable / N;
        
        document.getElementById('out-emi-monthly-rate').textContent = `${(monthlyRate * 100).toFixed(1)}%`;
        document.getElementById('out-emi-total-interest').textContent = formatINR(totalInterest);
        document.getElementById('out-emi-total-payable').textContent = formatINR(totalRepayable);
        document.getElementById('out-emi-main-val').textContent = formatINR(emi);

        return { P, N, rate: monthlyRate, emi, totalRepayable, totalInterest };
    };

    if (emiAmountSlider && emiTenureSlider) {
        emiAmountSlider.addEventListener('input', calculateNewLoanEMI);
        emiTenureSlider.addEventListener('input', calculateNewLoanEMI);
        calculateNewLoanEMI();
    }

    // Save New Loan
    const btnSaveNewLoan = document.getElementById('btn-save-new-loan');
    if (btnSaveNewLoan) {
        btnSaveNewLoan.addEventListener('click', () => {
            const customerName = document.getElementById('new-name').value.trim();
            const mobileNumber = document.getElementById('new-mobile').value.trim();
            const vehicleNumber = document.getElementById('new-vehicle').value.trim();
            const startDate = document.getElementById('new-start-date').value;
            
            if (!customerName || !mobileNumber || !vehicleNumber || !startDate) {
                alert('Please fill out all Customer Information fields.');
                return;
            }

            const results = calculateNewLoanEMI();
            
            const record = {
                id: Date.now(),
                timestamp: Date.now(),
                customerName,
                mobileNumber,
                vehicleNumber,
                startDate,
                loanAmount: results.P,
                tenureMonths: results.N,
                rate: results.rate,
                emi: results.emi,
                totalPayable: results.totalRepayable,
                payments: [],
                lateFees: []
            };

            const records = getRecords();
            records.push(record);
            saveRecords(records);
            
            // Clear inputs
            document.getElementById('new-name').value = '';
            document.getElementById('new-mobile').value = '';
            document.getElementById('new-vehicle').value = '';
            
            renderDashboard();
            showView('view-dashboard');
        });
    }

    // INITIALIZATION
    renderDashboard();
});
