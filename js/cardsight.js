/******************************************************************************
 * TrueCard
 * CardSight API
 ******************************************************************************/

async function identifyCard(imageBlob) {

    const formData = new FormData();

    formData.append("image", imageBlob);

    try {

        const response = await fetch(

            `${CONFIG.CARDSIGHT_BASE_URL}/identify/card`,

            {

                method: "POST",

                headers: {

                    "X-API-Key": CONFIG.CARDSIGHT_API_KEY

                },

                body: formData

            }

        );

        if (!response.ok) {

            throw new Error(
                `CardSight Error: ${response.status}`
            );

        }

        const result = await response.json();

        console.log("CardSight Response");

        console.log(result);

        return result;

    }

    catch (error) {

        console.error(error);

        alert("Unable to contact CardSight.");

        return null;

    }

}
