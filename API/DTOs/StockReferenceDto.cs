namespace API.DTOs
{
    // DTO for creating/updating Stock Supplier
    public class StockSupplierDto
    {
        public int Id { get; set; }
        public string SupplierName { get; set; }
    }

    // DTO for creating/updating Stock Entities
    public class StockEntitiesDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }

    // DTO for creating/updating Stock Status
    public class StockStatusDto
    {
        public int Id { get; set; }
        public string StatusName { get; set; }
    }
}
