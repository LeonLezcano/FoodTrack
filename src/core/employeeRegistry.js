/**
 * FoodTrack - Employee Registry & Corporate Plants Engine
 * Engine #245 (Identification) & Medical Dietary Profiles (Ley 26.588)
 */

export class EmployeeRegistry {
  constructor() {
    this.employees = new Map();
    this.companies = new Map();
    this.idCounter = 100;
  }

  generateId() {
    this.idCounter += 1;
    return `EMP-${this.idCounter}-${Date.now().toString(36).slice(-4)}`;
  }

  registerCompany({ id, name, plantAddress, contactPerson, contactPhone, contractMealPrice = 8500 }) {
    if (!id || !name) throw new Error('ID y Nombre de Empresa son obligatorios');
    const comp = {
      id: String(id).trim(),
      name: String(name).trim(),
      plantAddress: plantAddress || '',
      contactPerson: contactPerson || 'Recursos Humanos',
      contactPhone: contactPhone || '',
      contractMealPrice: Number(contractMealPrice) || 8500,
      createdAt: new Date().toISOString()
    };
    this.companies.set(comp.id, comp);
    return comp;
  }

  getCompany(id) {
    return this.companies.get(id) || null;
  }

  listCompanies() {
    return Array.from(this.companies.values());
  }

  registerEmployee(data) {
    if (!data.dni || !data.fullName || !data.companyId) {
      throw new Error('DNI, Nombre Completo y Empresa son obligatorios');
    }

    const cleanDni = String(data.dni).trim();

    // Check duplicate DNI
    for (const emp of this.employees.values()) {
      if (emp.dni === cleanDni && emp.status === 'active') {
        throw new Error(`Ya existe un operario activo con el DNI ${cleanDni}`);
      }
    }

    const company = this.companies.get(data.companyId);
    const companyName = company ? company.name : (data.companyName || 'Planta Industrial');

    const employee = {
      id: data.id || this.generateId(),
      dni: cleanDni,
      fullName: String(data.fullName).trim(),
      companyId: String(data.companyId).trim(),
      companyName,
      shift: data.shift || 'Mañana', // 'Mañana', 'Tarde', 'Noche'
      sector: data.sector || 'Planta General',
      dietaryProfile: data.dietaryProfile || 'Estándar', // 'Estándar', 'Sin TACC (Celíaco)', 'Hiposódico', 'Diabético', 'Vegetariano'
      subsidyPercentage: data.subsidyPercentage !== undefined ? Number(data.subsidyPercentage) : 80, // Default 80% corporate subsidy
      phone: data.phone || '+5491100000000',
      status: 'active', // 'active', 'suspended', 'on_leave'
      createdAt: data.createdAt || new Date().toISOString()
    };

    this.employees.set(employee.id, employee);
    return employee;
  }

  updateEmployee(id, updates) {
    const employee = this.employees.get(id);
    if (!employee) throw new Error(`Operario no encontrado: ${id}`);

    const safe = { ...updates };
    delete safe.id;
    delete safe.createdAt;

    Object.assign(employee, safe);
    this.employees.set(id, employee);
    return employee;
  }

  getEmployee(id) {
    return this.employees.get(id) || null;
  }

  findByDni(dni) {
    const clean = String(dni).trim();
    for (const emp of this.employees.values()) {
      if (emp.dni === clean) return emp;
    }
    return null;
  }

  listEmployees(filter = {}) {
    let result = Array.from(this.employees.values());

    if (filter.companyId) {
      result = result.filter(e => e.companyId === filter.companyId);
    }
    if (filter.shift) {
      result = result.filter(e => e.shift === filter.shift);
    }
    if (filter.status) {
      result = result.filter(e => e.status === filter.status);
    }
    if (filter.dietaryProfile) {
      result = result.filter(e => e.dietaryProfile === filter.dietaryProfile);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(e =>
        e.fullName.toLowerCase().includes(q) ||
        e.dni.includes(q) ||
        e.sector.toLowerCase().includes(q)
      );
    }

    return result;
  }

  getDietaryRequirements(companyId) {
    const list = this.listEmployees({ companyId, status: 'active' });
    const counts = {
      'Estándar': 0,
      'Sin TACC (Celíaco)': 0,
      'Hiposódico': 0,
      'Diabético': 0,
      'Vegetariano': 0
    };

    list.forEach(emp => {
      const diet = emp.dietaryProfile || 'Estándar';
      counts[diet] = (counts[diet] || 0) + 1;
    });

    return {
      totalEmployees: list.length,
      counts
    };
  }
}
