<template>
    <div class="dashboard">
        <h2>Firebase Remote Config Dashboard</h2>

        <!-- FORM: Tambah / Edit Parameter -->
        <div class="form-section">
            <h3>{{ isEditing ? 'Edit Parameter' : 'Tambah Parameter Baru' }}</h3>
            <form @submit.prevent="saveParameter">
                <div class="form-group">
                    <label>Parameter Key:</label>
                    <!-- Input key di-disable jika sedang mengedit parameter lama -->
                    <input v-model="form.key" type="text" :disabled="isEditing" placeholder="e.g., maintenance_mode"
                        required />
                </div>

                <div class="form-group">
                    <label>Value Type:</label>
                    <select v-model="form.valueType" required>
                        <option value="STRING">String</option>
                        <option value="NUMBER">Number</option>
                        <option value="BOOLEAN">Boolean</option>
                        <option value="JSON">JSON</option>
                    </select>
                </div>

                <div class="form-group" v-if="form.useInAppDefault === false">
                    <label>Value:</label>
                    <input v-model="form.value" type="text" placeholder="e.g., true atau 1.0.0" required />
                </div>

                <div class="form-group">
                    <label>Deskripsi (Opsional):</label>
                    <input v-model="form.description" type="text" placeholder="Keterangan parameter" />
                </div>

                <!-- in app default toggle -->
                <div class="switch">
                    <label>
                        <input v-model="form.useInAppDefault" type="checkbox" />
                        Gunakan nilai default in-app
                    </label>
                </div>

                <div class="form-actions">
                    <button type="submit" :disabled="submitting" class="btn-primary">
                        {{ submitting ? 'Menyimpan...' : 'Simpan Parameter' }}
                    </button>
                    <button v-if="isEditing" type="button" @click="resetForm" class="btn-secondary">Batal</button>
                </div>
            </form>
        </div>

        <!-- LIST: Tabel Parameter Aktif -->
        <div class="list-section">
            <h3>Daftar Parameter Aktif</h3>
            <div v-if="loading" class="loading">Memuat data dari Firebase...</div>

            <table v-else class="config-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Condition</th>
                        <th>Value</th>
                        <th>Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="param in parameterList" :key="param.key">
                        <td class="font-bold">{{ param.key }}</td>
                        <td>{{ 'Default Value' }}</td>
                        <td>{{ param.useInAppDefault ? '(in-app default)' : param.value }}</td>
                        <td><code>{{ param.valueType || '-' }}</code></td>
                        <td>
                            <div class="actions">
                                <button @click="startEdit(param)" class="btn-edit">Edit</button>
                                <button @click="startDelete(param)" class="btn-delete">Delete</button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="parameters.length === 0">
                        <td colspan="4" class="text-center">Tidak ada parameter ditemukan.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';

interface RemoteConfigParameter {
    key: string;
    value: string;
    description?: string;
    valueType: string;
    defaultValue?: {
        useInAppDefault?: boolean;
        value?: string;
    };
    useInAppDefault?: boolean;
}

const API_URL = 'http://localhost:3000/api/config';

// State Manajemen
const parameters = ref<RemoteConfigParameter[]>([]);
const loading = ref(false);
const submitting = ref(false);
const isEditing = ref(false);

const form = reactive({
    key: '',
    value: '',
    description: '',
    valueType: 'STRING',
    useInAppDefault: false
});

// Ambil data list parameter saat komponen di-load
const fetchParameters = async () => {
    loading.value = true;
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        if (data.success) {
            parameters.value = data.parameters;
        } else {
            alert('Gagal mengambil data: ' + data.error);
        }
    } catch (error) {
        alert('Terjadi kesalahan koneksi server backend.' + error);
    } finally {
        loading.value = false;
    }
};

// Fungsi memindahkan data tabel ke dalam form untuk di-edit
const startEdit = (param: RemoteConfigParameter) => {
    isEditing.value = true;
    form.key = param.key;
    form.value = param.value;
    form.description = param.description || '';
    form.valueType = param.valueType;
    form.useInAppDefault = param.useInAppDefault || false;
};

const startDelete = (param: RemoteConfigParameter) => {
    const response = confirm(`Apakah Anda yakin ingin menghapus parameter "${param.key}"?`);
    if (response) {
        fetch(`${API_URL}/${param.key}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    fetchParameters(); // Refresh data setelah delete
                } else {
                    alert('Gagal menghapus: ' + data.error);
                }
            })
            .catch(error => {
                alert('Gagal menghubungi server backend.' + error);
            });
    }
};

// Reset Form ke keadaan semula
const resetForm = () => {
    isEditing.value = false;
    form.key = '';
    form.value = '';
    form.description = '';
    form.valueType = 'STRING';
    form.useInAppDefault = false;
};

// Kirim data tambah/edit ke backend Admin SDK
const saveParameter = async () => {
    submitting.value = true;
    try {
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form })
        });

        const data = await response.json();
        if (data.success) {
            alert(data.message);
            resetForm();
            await fetchParameters(); // Refresh isi tabel biar langsung update
        } else {
            alert('Gagal menyimpan: ' + data.error);
        }
    } catch (error) {
        alert('Gagal mengirim data ke backend.' + error);
    } finally {
        submitting.value = false;
    }
};

const parameterList = computed(() => {
    const params = parameters.value || {};

    return Object.keys(params).map(key => {
        const item = params[key];
        const isAppDefault = item.defaultValue?.useInAppDefault || false;

        return {
            key: key,
            // Jika useInAppDefault true, kita beri string kosong atau fallback
            value: isAppDefault ? '' : (item.defaultValue?.value ?? ''),
            valueType: item.valueType || 'STRING',
            useInAppDefault: isAppDefault,
            description: item.description || ''
        };
    });
});

onMounted(() => {
    fetchParameters();
});
</script>

<style scoped>
.switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-direction: row;
}

.dashboard {
    max-width: 800px;
    margin: 30px auto;
    font-family: sans-serif;
    padding: 0 15px;
}

.form-section {
    background: #f9f9f9;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    border: 1px solid #e2e8f0;
}

.form-group {
    margin-bottom: 12px;
}

.form-group label {
    display: block;
    font-weight: bold;
    margin-bottom: 4px;
}

.form-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    box-sizing: border-box;
}

.form-actions {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

.config-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
}

.config-table th,
.config-table td {
    padding: 10px;
    border: 1px solid #cbd5e1;
    text-align: left;
}

.config-table th {
    background: #f1f5f9;
}

.font-bold {
    font-weight: bold;
}

.text-muted {
    color: #64748b;
    font-size: 0.9em;
}

.btn-primary {
    background: #42b883;
    color: white;
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.btn-secondary {
    background: #94a3b8;
    color: white;
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.btn-edit {
    background: #3b82f6;
    color: white;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.btn-delete {
    background: #ef4444;
    color: white;
    padding: 5px 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.actions {
    display: flex;
    gap: 5px;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>