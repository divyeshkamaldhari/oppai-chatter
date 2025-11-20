import dayjs from "dayjs";
import { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import "../../styles/AnalyticsCard/UserPurchase.css";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
interface Purchase {
  id: number | string;
  product_name: string;
  purchased_at: string;
  order_total: string;
  order_id: string | number;
}

type Props = {
  userUID: any;
};

const UserPurchases = ({ userUID }: Props) => {
  const { purchases = [] } = useContext(AppContext) as any;

  return (
    <div className="user-analytics">
      <div className="kpi-data-notes">
        <h2 className="cometchat-user-details__content-title">Purchase List</h2>          
          <div className="tbl-wraapper">
            <div className="purchase-grid-wraapper scrollbar-hide">
                {purchases?.length ? (
                  purchases.map((el: Purchase, index: number) => (
              <div className="purchase-grid" key={"purchase-" + index}>
                <div className="purchase-card-wrap">
                  <div className="purchase-card">
                    <div className="purchase-col2">
                      <div className="card-data">
                        <h3>Order ID</h3>
                        <p>{el?.order_id || "N/A"}</p>
                      </div>
                     <div className="card-data">
                      <h3>Purchase Date</h3>
                      <p>
                        {(() => {
                          try {
                            if (!el?.purchased_at) return "N/A";
                            const parsed = dayjs.utc(el.purchased_at).tz("America/New_York");
                            return parsed.isValid()
                              ? parsed.format("MM-DD-YYYY hh:mm A")
                              : "Invalid Date";
                          } catch (error) {
                            console.error("Error parsing purchased_at:", error);
                            return "N/A";
                          }
                        })()}
                      </p>
                    </div>

                    </div>
                    <div className="card-data">
                      <h3>Product Name</h3>
                      <p>{el?.product_name || "N/A"}</p>
                    </div>
                    <div className="card-data amount-card">
                      <h3>Purchase Amount</h3>
                      <p>{`$${el?.order_total}` || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
                  ))
                ) : (
                    <div className="purchase-grid">
                      <div className="purchase-card-wrap">
                        <div className="purchase-card">
                          <div className="purchase-col2">
                            <div className="card-data">
                              <h3>No Purchases Yet</h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                )}
          </div>
          </div>
      </div>
    </div>
  );
};

export default UserPurchases;
