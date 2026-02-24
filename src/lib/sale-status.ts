export function saleStatusLabel(status: string | undefined): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "PAID":
      return "Paga";
    case "CANCELED":
      return "Cancelada";
    default:
      return status || "-";
  }
}
