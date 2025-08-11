const { createApp, ref, reactive, computed, onMounted, watch, nextTick } = Vue;
    const { createVuetify } = Vuetify;
    const vuetify = createVuetify();

    const firebaseConfig = {
        apiKey: "AIzaSyDI8sneHmmHujbo7fj8sYapcnYlHmg_QfI",
        authDomain: "inventoryperusahaan.firebaseapp.com",
        projectId: "inventoryperusahaan",
        storageBucket: "inventoryperusahaan.appspot.com",
        messagingSenderId: "65757520382",
        appId: "1:65757520382:web:7ee31b5c0efad10e57a0af",
        measurementId: "G-F49DNQJJ1Y"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    createApp({
        setup() {
            const user = reactive({ isLoggedIn: false, uid: null, email: null, role: null });
            const loginForm = reactive({ email: '', password: '' });
            const loginError = ref(null);
            const drawer = ref(true);
            const page = ref('dashboard');
            const masterDataTab = ref('items');
            const items = ref([]);
            const suppliers = ref([]);
            const customers = ref([]);
            const transactions = ref([]);
            const purchaseOrders = ref([]);
            const salesOrders = ref([]);
            const isLoading = ref(true);
            const stockSearch = ref('');
            const itemDialog = ref(false);
            const itemMasterHeaders = ref([ { title: 'SKU', key: 'sku' }, { title: 'Nama Barang', key: 'name' }, { title: 'Harga Modal', key: 'costPrice' }, { title: 'Lokasi', key: 'location' }, { title: 'Barcode', key: 'barcode' }, { title: 'Aksi', key: 'actions', sortable: false }, ]);
            const defaultItem = { sku: '', name: '', costPrice: 0, location: '', minStockLevel: 0, barcode: '' };
            const editedItem = ref({ ...defaultItem });
            const editedIndex = ref(-1);
            const itemFormTitle = computed(() => editedIndex.value === -1 ? 'Barang Baru' : 'Edit Barang');
            const stockHeaders = ref([ { title: 'SKU', key: 'sku' }, { title: 'Nama Barang', key: 'name' }, { title: 'Stok Fisik', key: 'physicalStock', align: 'center' }, { title: 'Stok Tersedia', key: 'availableStock', align: 'center' }, { title: 'Aksi', key: 'actions', sortable: false, align: 'center' }, ]);
            const historyDialog = ref(false);
            const isHistoryLoading = ref(false);
            const historyItem = ref({});
            const historyTransactions = ref([]);
            const historyHeaders = ref([ { title: 'Waktu', key: 'timestamp' }, { title: 'Tipe', key: 'type' }, { title: 'Perubahan', key: 'quantityChange', align: 'center' }, { title: 'Referensi', key: 'reference' }, { title: 'Oleh', key: 'user.email' }, ]);
            const poDialog = ref(false);
            const receiveDialog = ref(false);
            const poHeaders = ref([ { title: 'Nomor PO', key: 'poNumber' }, { title: 'Supplier', key: 'supplier.name' }, { title: 'Tanggal', key: 'createdAt' }, { title: 'Status', key: 'status' }, { title: 'Aksi', key: 'actions', sortable: false } ]);
            const defaultPO = { poNumber: '', supplierId: null, status: 'ORDERED', items: [] };
            const editedPO = ref({ ...defaultPO });
            const receivingPO = ref({});
            const receiptQuantities = ref({});
            const soDialog = ref(false);
            const shipmentDialog = ref(false);
            const soHeaders = ref([ { title: 'Nomor SO', key: 'soNumber' }, { title: 'Pelanggan', key: 'customer.name' }, { title: 'Tanggal', key: 'createdAt' }, { title: 'Status', key: 'status' }, { title: 'Aksi', key: 'actions', sortable: false } ]);
            const defaultSO = { soNumber: '', customerId: null, status: 'PENDING', items: [] };
            const editedSO = ref({ ...defaultSO });
            const shippingSO = ref({});
            const shipmentQuantities = ref({});
            const adjustment = reactive({ itemId: null, quantity: null, reason: '' });
            const reportStartDate = ref(null);
            const reportEndDate = ref(null);
            const supplierDialog = ref(false);
            const customerDialog = ref(false);
            const supplierHeaders = ref([ { title: 'Nama Supplier', key: 'name' }, { title: 'Kontak', key: 'contactPerson' }, { title: 'Telepon', key: 'phone' }, { title: 'Aksi', key: 'actions', sortable: false } ]);
            const customerHeaders = ref([ { title: 'Nama Pelanggan', key: 'name' }, { title: 'Kontak', key: 'contactPerson' }, { title: 'Telepon', key: 'phone' }, { title: 'Aksi', key: 'actions', sortable: false } ]);
            const defaultContact = { name: '', contactPerson: '', phone: '', email: '', address: '' };
            const editedContact = ref({ ...defaultContact });
            const contactFormTitle = computed(() => editedIndex.value === -1 ? 'Tambah Baru' : 'Edit Kontak');
            const scannerDialog = ref(false);
            let html5QrCode = null;
            const activityChartInstance = ref(null);

            onMounted(() => {
                auth.onAuthStateChanged(async (firebaseUser) => {
                    if (firebaseUser) {
                        const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
                        user.role = userDoc.exists ? userDoc.data().role : 'staff';
                        user.isLoggedIn = true; user.uid = firebaseUser.uid; user.email = firebaseUser.email;
                        if (user.role === 'staff') { page.value = 'stock'; } else { page.value = 'dashboard' }
                        loadAppData();
                    } else {
                        user.isLoggedIn = false; user.uid = null; user.email = null; user.role = null;
                        isLoading.value = false;
                    }
                });
            });

            function loadAppData() {
                isLoading.value = true;
                db.collection('items').onSnapshot(snapshot => { items.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); checkIfLoadingDone(); });
                db.collection('suppliers').onSnapshot(snapshot => { suppliers.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); checkIfLoadingDone(); });
                db.collection('customers').onSnapshot(snapshot => { customers.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); checkIfLoadingDone(); });
                db.collection('inventoryTransactions').orderBy('timestamp', 'desc').onSnapshot(snapshot => { transactions.value = snapshot.docs.map(doc => ({...doc.data(), id: doc.id})); checkIfLoadingDone(); });
                db.collection('purchaseOrders').orderBy('createdAt', 'desc').onSnapshot(snapshot => { purchaseOrders.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); checkIfLoadingDone(); });
                db.collection('salesOrders').orderBy('createdAt', 'desc').onSnapshot(snapshot => { salesOrders.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); checkIfLoadingDone(); });
            }

            function checkIfLoadingDone() {
                if (items.value && transactions.value && purchaseOrders.value && salesOrders.value && suppliers.value && customers.value) {
                    isLoading.value = false;
                }
            }
            
            const itemsWithCalculatedStock = computed(() => {
                return items.value.map(item => {
                    const physicalStock = transactions.value.filter(t => t.itemId === item.id).reduce((total, t) => total + t.quantityChange, 0);
                    const allocatedStock = salesOrders.value.filter(so => so.status !== 'SHIPPED' && so.status !== 'COMPLETED').flatMap(so => so.items).filter(soItem => soItem.itemId === item.id).reduce((total, soItem) => total + (soItem.quantityOrdered - (soItem.quantityShipped || 0)), 0);
                    const availableStock = physicalStock - allocatedStock;
                    return { ...item, physicalStock, availableStock };
                });
            });
            const filteredStockItems = computed(() => {
                if (!stockSearch.value) return itemsWithCalculatedStock.value;
                const searchTerm = stockSearch.value.toLowerCase();
                return itemsWithCalculatedStock.value.filter(item => item.name.toLowerCase().includes(searchTerm) || item.sku.toLowerCase().includes(searchTerm));
            });
            const lowStockItems = computed(() => itemsWithCalculatedStock.value.filter(item => item.physicalStock <= (item.minStockLevel || 0)));
            const totalSKU = computed(() => items.value.length);
            const totalUnits = computed(() => itemsWithCalculatedStock.value.reduce((sum, item) => sum + item.physicalStock, 0));
            const totalAssetValue = computed(() => itemsWithCalculatedStock.value.reduce((sum, item) => sum + (item.physicalStock * (item.costPrice || 0)), 0));
            const chartData = computed(() => {
                const labels = []; const dataIn = []; const dataOut = [];
                for (let i = 0; i < 7; i++) {
                    const date = new Date(); date.setDate(date.getDate() - i);
                    labels.unshift(date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
                    const dailyTransactions = transactions.value.filter(t => t.timestamp && new Date(t.timestamp.seconds * 1000).toDateString() === date.toDateString());
                    dataIn.unshift(dailyTransactions.filter(t => t.type === 'IN' || (t.type === 'ADJUSTMENT' && t.quantityChange > 0)).reduce((sum, t) => sum + t.quantityChange, 0));
                    dataOut.unshift(Math.abs(dailyTransactions.filter(t => t.type === 'OUT' || (t.type === 'ADJUSTMENT' && t.quantityChange < 0)).reduce((sum, t) => sum + t.quantityChange, 0)));
                }
                return { labels, dataIn, dataOut };
            });
            const filteredTransactionsForReport = computed(() => {
                if (!reportStartDate.value || !reportEndDate.value) {
                    return transactions.value;
                }
                const start = new Date(reportStartDate.value).setHours(0, 0, 0, 0);
                const end = new Date(reportEndDate.value).setHours(23, 59, 59, 999);
                return transactions.value.filter(t => {
                    if (!t.timestamp) return false;
                    const tDate = new Date(t.timestamp.seconds * 1000);
                    return tDate >= start && tDate <= end;
                });
            });
            const currentPageTitle = computed(() => {
                switch(page.value) {
                    case 'dashboard': return 'Dashboard';
                    case 'stock': return 'Stok Gudang';
                    case 'po': return 'Purchase Order';
                    case 'so': return 'Sales Order';
                    case 'adjustment': return 'Penyesuaian Stok';
                    case 'reports': return 'Laporan';
                    case 'masterdata': return 'Master Data';
                    default: return 'Invigo';
                }
            });

            function openItemDialog() { editedIndex.value = -1; editedItem.value = { ...defaultItem }; itemDialog.value = true; }
            function editItem(item) { editedIndex.value = items.value.findIndex(i => i.id === item.id); editedItem.value = { ...item }; itemDialog.value = true; }
            function deleteItem(item) { if (confirm(`Yakin mau hapus barang "${item.name}"?`)) { db.collection('items').doc(item.id).delete(); } }
            function closeItemDialog() { itemDialog.value = false; }
            function saveItem() {
                if (!editedItem.value.sku || !editedItem.value.name) { alert('SKU dan Nama Barang tidak boleh kosong!'); return; }
                if (editedIndex.value > -1) { db.collection('items').doc(editedItem.value.id).update(editedItem.value); } 
                else { db.collection('items').add({ ...editedItem.value, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }
                closeItemDialog();
            }
            function showHistory(item) {
                historyItem.value = item; historyDialog.value = true; isHistoryLoading.value = true;
                historyTransactions.value = transactions.value.filter(t => t.itemId === item.id).map(t => ({...t, timestamp: t.timestamp ? t.timestamp : { seconds: Date.now()/1000 } }));
                isHistoryLoading.value = false;
            }
            function getHistoryChipColor(type, change) { if (type === 'IN') return 'success'; if (type === 'OUT') return 'error'; if (type === 'ADJUSTMENT') return change > 0 ? 'teal' : 'orange'; return 'grey'; }
            function openPODialog() { editedPO.value = { ...defaultPO, items: [] }; poDialog.value = true; }
            function closePODialog() { poDialog.value = false; }
            function addItemToPO() { editedPO.value.items.push({ itemId: '', quantityOrdered: 0, quantityReceived: 0 }); }
            function removeItemFromPO(index) { editedPO.value.items.splice(index, 1); }
            function savePO() {
                const supplier = suppliers.value.find(s => s.id === editedPO.value.supplierId);
                db.collection('purchaseOrders').add({ ...editedPO.value, supplier: { id: supplier.id, name: supplier.name }, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: { email: user.email, uid: user.uid } }).then(() => closePODialog()); 
            }
            function openReceiveDialog(po) { receivingPO.value = JSON.parse(JSON.stringify(po)); receiptQuantities.value = {}; receiveDialog.value = true; }
            function closeReceiveDialog() { receiveDialog.value = false; }
            async function saveGoodsReceipt() {
                const poRef = db.collection('purchaseOrders').doc(receivingPO.value.id);
                const batch = db.batch(); let allItemsFullyReceived = true;
                for (const item of receivingPO.value.items) {
                    const receivedQty = receiptQuantities.value[item.itemId] || 0;
                    if (receivedQty > 0) {
                        const transactionRef = db.collection('inventoryTransactions').doc();
                        batch.set(transactionRef, { itemId: item.itemId, type: 'IN', quantityChange: receivedQty, reference: `PO: ${receivingPO.value.poNumber}`, timestamp: firebase.firestore.FieldValue.serverTimestamp(), user: { email: user.email, uid: user.uid } });
                        item.quantityReceived = (item.quantityReceived || 0) + receivedQty;
                    }
                    if ((item.quantityReceived || 0) < item.quantityOrdered) { allItemsFullyReceived = false; }
                }
                const newStatus = allItemsFullyReceived ? 'COMPLETED' : 'PARTIALLY_RECEIVED';
                batch.update(poRef, { items: receivingPO.value.items, status: newStatus });
                await batch.commit();
                closeReceiveDialog();
            }
            function getPOStatusColor(status) { if (status === 'COMPLETED') return 'success'; if (status === 'PARTIALLY_RECEIVED') return 'warning'; return 'info'; }
            function getItemName(itemId) { const item = items.value.find(i => i.id === itemId); return item ? item.name : 'N/A'; }
            function openSODialog() { editedSO.value = { ...defaultSO, items: [] }; soDialog.value = true; }
            function closeSODialog() { soDialog.value = false; }
            function addItemToSO() { editedSO.value.items.push({ itemId: '', quantityOrdered: 0, quantityShipped: 0 }); }
            function removeItemFromSO(index) { editedSO.value.items.splice(index, 1); }
            function saveSO() {
                const customer = customers.value.find(c => c.id === editedSO.value.customerId);
                db.collection('salesOrders').add({ ...editedSO.value, customer: { id: customer.id, name: customer.name }, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: { email: user.email, uid: user.uid } }).then(() => closeSODialog()); 
            }
            function openShipmentDialog(so) { shippingSO.value = JSON.parse(JSON.stringify(so)); shipmentQuantities.value = {}; shipmentDialog.value = true; }
            function closeShipmentDialog() { shipmentDialog.value = false; }
            async function saveShipment() {
                const soRef = db.collection('salesOrders').doc(shippingSO.value.id);
                const batch = db.batch(); let allItemsFullyShipped = true;
                for (const item of shippingSO.value.items) {
                    const shippedQty = shipmentQuantities.value[item.itemId] || 0;
                    if (shippedQty > 0) {
                        const transactionRef = db.collection('inventoryTransactions').doc();
                        batch.set(transactionRef, { itemId: item.itemId, type: 'OUT', quantityChange: -shippedQty, reference: `SO: ${shippingSO.value.soNumber}`, timestamp: firebase.firestore.FieldValue.serverTimestamp(), user: { email: user.email, uid: user.uid } });
                        item.quantityShipped = (item.quantityShipped || 0) + shippedQty;
                    }
                    if ((item.quantityShipped || 0) < item.quantityOrdered) { allItemsFullyShipped = false; }
                }
                const newStatus = allItemsFullyShipped ? 'SHIPPED' : 'PARTIALLY_SHIPPED';
                batch.update(soRef, { items: shippingSO.value.items, status: newStatus });
                await batch.commit();
                closeShipmentDialog();
            }
            function getSOStatusColor(status) { if (status === 'SHIPPED' || status === 'COMPLETED') return 'success'; if (status === 'PARTIALLY_SHIPPED') return 'warning'; return 'info'; }
            function saveAdjustment() {
                db.collection('inventoryTransactions').add({
                    itemId: adjustment.itemId, type: 'ADJUSTMENT', quantityChange: adjustment.quantity,
                    reference: 'ADJ', reason: adjustment.reason, timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    user: { uid: user.uid, email: user.email }
                }).then(() => {
                    adjustment.itemId = null; adjustment.quantity = null; adjustment.reason = '';
                    alert('Penyesuaian stok berhasil disimpan.');
                });
            }
            function openSupplierDialog() { editedIndex.value = -1; editedContact.value = { ...defaultContact }; supplierDialog.value = true; }
            function editSupplier(supplier) { editedIndex.value = suppliers.value.findIndex(s => s.id === supplier.id); editedContact.value = { ...supplier }; supplierDialog.value = true; }
            function deleteSupplier(supplier) { if (confirm(`Yakin mau hapus supplier "${supplier.name}"?`)) { db.collection('suppliers').doc(supplier.id).delete(); } }
            function saveSupplier() {
                if (editedIndex.value > -1) { db.collection('suppliers').doc(editedContact.value.id).update(editedContact.value); } 
                else { db.collection('suppliers').add(editedContact.value); }
                closeContactDialog();
            }
            function openCustomerDialog() { editedIndex.value = -1; editedContact.value = { ...defaultContact }; customerDialog.value = true; }
            function editCustomer(customer) { editedIndex.value = customers.value.findIndex(c => c.id === customer.id); editedContact.value = { ...customer }; customerDialog.value = true; }
            function deleteCustomer(customer) { if (confirm(`Yakin mau hapus pelanggan "${customer.name}"?`)) { db.collection('customers').doc(customer.id).delete(); } }
            function saveCustomer() {
                if (editedIndex.value > -1) { db.collection('customers').doc(editedContact.value.id).update(editedContact.value); } 
                else { db.collection('customers').add(editedContact.value); }
                closeContactDialog();
            }
            function closeContactDialog() { supplierDialog.value = false; customerDialog.value = false; }
            function exportToCSV() {
                const dataToExport = filteredTransactionsForReport.value.map(t => ({
                    Waktu: t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleString('id-ID') : 'N/A',
                    SKU: getItemName(t.itemId), Tipe: t.type, Perubahan_Kuantitas: t.quantityChange,
                    Referensi: t.reference || '', Alasan: t.reason || '', Oleh: t.user ? t.user.email : 'N/A'
                }));
                const csv = Papa.unparse(dataToExport);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `Laporan_Transaksi_${new Date().toISOString().slice(0,10)}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            function startScanner(context) {
                scannerDialog.value = true;
                nextTick(() => {
                    html5QrCode = new Html5Qrcode("reader");
                    const onScanSuccess = (decodedText, decodedResult) => {
                        const item = items.value.find(i => i.barcode === decodedText);
                        if (item) {
                            if (context === 'receive') {
                                receiptQuantities.value[item.id] = (receiptQuantities.value[item.id] || 0) + 1;
                            } else if (context === 'ship') {
                                shipmentQuantities.value[item.id] = (shipmentQuantities.value[item.id] || 0) + 1;
                            }
                        } else {
                            alert('Barcode tidak ditemukan di master barang!');
                        }
                    };
                    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, (errorMessage) => {});
                });
            }
            function stopScanner() {
                if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().then(() => {
                        scannerDialog.value = false;
                    }).catch(err => {
                        console.error("Gagal menghentikan scanner", err);
                        scannerDialog.value = false;
                    });
                } else {
                    scannerDialog.value = false;
                }
            }
            function renderChart() {
                if (activityChartInstance.value) { activityChartInstance.value.destroy(); }
                const ctx = document.getElementById('activityChart')?.getContext('2d'); if (!ctx) return;
                activityChartInstance.value = new Chart(ctx, {
                    type: 'bar', data: { labels: chartData.value.labels, datasets: [ { label: 'Barang Masuk', data: chartData.value.dataIn, backgroundColor: 'rgba(75, 192, 192, 0.5)', borderColor: 'rgb(75, 192, 192)', borderWidth: 1 }, { label: 'Barang Keluar', data: chartData.value.dataOut, backgroundColor: 'rgba(255, 99, 132, 0.5)', borderColor: 'rgb(255, 99, 132)', borderWidth: 1 } ] },
                    options: { scales: { y: { beginAtZero: true } } }
                });
            }
            async function handleLogin() {
                loginError.value = null;
                try { await auth.signInWithEmailAndPassword(loginForm.email, loginForm.password); } catch (error) { loginError.value = "Email atau password salah."; }
            }
            async function handleLogout() { await auth.signOut(); }
            watch(page, (newPage) => { if (newPage === 'dashboard') { nextTick(renderChart); }});
            watch(transactions, () => { if (page.value === 'dashboard') { nextTick(renderChart); }}, { deep: true });

            return {
                user, loginForm, handleLogin, handleLogout, loginError, drawer, page, currentPageTitle, items, suppliers, customers, transactions, purchaseOrders, salesOrders, isLoading,
                stockSearch, filteredStockItems, lowStockItems, itemDialog, itemMasterHeaders, editedItem, editedIndex, itemFormTitle,
                openItemDialog, editItem, deleteItem, closeItemDialog, saveItem, stockHeaders, itemsWithCalculatedStock,
                historyDialog, isHistoryLoading, historyItem, historyTransactions, historyHeaders, showHistory, getHistoryChipColor,
                poDialog, receiveDialog, poHeaders, editedPO, receivingPO, receiptQuantities, openPODialog, closePODialog, addItemToPO,
                removeItemFromPO, savePO, openReceiveDialog, closeReceiveDialog, saveGoodsReceipt, getPOStatusColor, getItemName,
                soDialog, shipmentDialog, soHeaders, editedSO, shippingSO, shipmentQuantities, openSODialog, closeSODialog, addItemToSO,
                removeItemFromSO, saveSO, openShipmentDialog, closeShipmentDialog, saveShipment, getSOStatusColor,
                adjustment, saveAdjustment, reportStartDate, reportEndDate, filteredTransactionsForReport, exportToCSV,
                masterDataTab, supplierDialog, customerDialog, supplierHeaders, customerHeaders, editedContact, contactFormTitle,
                openSupplierDialog, editSupplier, deleteSupplier, saveSupplier, openCustomerDialog, editCustomer, deleteCustomer, saveCustomer, closeContactDialog,
                scannerDialog, startScanner, stopScanner,
                totalSKU, totalUnits, totalAssetValue
            };
        }
    }).use(vuetify).mount('#app');