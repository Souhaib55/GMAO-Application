// CreateStockDTO.cs
namespace Core.DTOs;
public class CreateStockDTO
{
    public string Code { get; set; }
    public string Description { get; set; }
    public int StockEntitiesId { get; set; }
    public int StockStatusId { get; set; }
    public int StockSupplierId { get; set; }
    public DateTime CreatedOn { get; set; }
}

