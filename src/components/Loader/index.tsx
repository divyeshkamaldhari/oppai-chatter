import { useEffect, useState } from "react";

import loader1 from "../../assets/loader-1.png";
import loader2 from "../../assets/loader-2.png";

const Loader = () => {
    const [scale, setScale] = useState(0.75);

    useEffect(() => {
        let growing = true;
        const interval = setInterval(() => {
            setScale((prev) => {
                if (growing && prev >= 1) growing = false;
                if (!growing && prev <= 0.75) growing = true;

                return +(prev + (growing ? 0.02 : -0.02)).toFixed(2);
            });
        }, 45);

        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                position: "fixed",
                left: "50%",
                top: "0",
                zIndex: 999999,
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                width: "100%",
                transform: "translateX(-50%)",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#130C1E",
                color: "black",
            }}
        >
            <div
                style={{
                    marginBottom: "3rem", // Tailwind mb-12
                    transform: "scale(0.8)",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <img alt="Loading..." src={loader1} />
                <img
                    alt="Loading..."
                    src={loader2}
                    style={{
                        position: "absolute",
                        bottom: "-130px",
                        transform: `scale(${scale})`,
                        transition: "transform 0.016s linear",
                    }}
                />
            </div>
        </div>
    );
};

export default Loader;
