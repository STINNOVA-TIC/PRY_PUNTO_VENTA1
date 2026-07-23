export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const isValidCedulaEcuatoriana = (cedula: string): boolean => {
  const clean = cedula.trim();

  if (!/^\d{10}$/.test(clean)) {
    return false;
  }

  const provincia = parseInt(clean.substring(0, 2), 10);
  if ((provincia < 1 || provincia > 24) && provincia !== 30) {
    return false;
  }

  const tercerDigito = parseInt(clean.substring(2, 3), 10);
  if (tercerDigito >= 6) {
    return false;
  }

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(clean[i], 10) * coeficientes[i];
    if (valor >= 10) {
      valor -= 9;
    }
    suma += valor;
  }

  const digitoVerificador = parseInt(clean[9], 10);
  const decenaSuperior = Math.ceil(suma / 10) * 10;
  let resta = decenaSuperior - suma;

  if (resta === 10) {
    resta = 0;
  }

  return resta === digitoVerificador;
};